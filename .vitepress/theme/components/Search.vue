<!-- 全局搜索 -->
<template>
  <Modal
    :show="store.searchShow"
    title="全局搜索"
    titleIcon="search"
    @mask-click="store.changeShowStatus('searchShow')"
    @modal-close="store.changeShowStatus('searchShow')"
  >
    <div class="ais-InstantSearch">
      <div class="ais-SearchBox">
        <input
          ref="searchInput"
          v-model="keyword"
          class="ais-SearchBox-input"
          type="search"
          placeholder="想要搜点什么"
          autocomplete="off"
        />
      </div>
      <div v-if="hasSearchValue" class="ais-Hits">
        <Transition name="fade" mode="out-in">
          <div v-if="loading" class="no-result">
            <i class="iconfont icon-search" />
            <span class="text">搜索索引加载中</span>
          </div>
          <div v-else-if="errorMessage" class="no-result">
            <i class="iconfont icon-search-empty" />
            <span class="text">{{ errorMessage }}</span>
          </div>
          <div v-else-if="pagedResults.length" class="search-list">
            <div
              v-for="item in pagedResults"
              :key="item.id"
              class="search-item s-card hover"
              @click="jumpSearch(item.url)"
            >
              <p class="title" v-html="item.title" />
              <p v-if="item.meta" class="anchor" v-html="item.meta" />
              <p v-if="item.content" class="content s-card" v-html="item.content" />
            </div>
          </div>
          <div v-else class="no-result">
            <i class="iconfont icon-search-empty" />
            <span class="text">搜索结果为空</span>
          </div>
        </Transition>
      </div>
      <div v-if="hasSearchValue && totalPages > 1" class="ais-Pagination">
        <ul class="ais-Pagination-list">
          <li
            v-for="pageIndex in pageNumbers"
            :key="pageIndex"
            class="ais-Pagination-item"
            :class="{ 'ais-Pagination-item--selected': pageIndex === currentPage }"
          >
            <button class="ais-Pagination-link" type="button" @click="currentPage = pageIndex">
              {{ pageIndex + 1 }}
            </button>
          </li>
        </ul>
      </div>
      <div class="ais-Stats">
        <div class="information">
          <span v-if="hasSearchValue && !loading && !errorMessage" class="text">
            本次用时 {{ processingTimeMS }} 毫秒，共 {{ searchResults.length }} 条结果
          </span>
        </div>
        <span class="power">
          <i class="iconfont icon-search" />
          <span class="name">本地搜索</span>
        </span>
      </div>
    </div>
  </Modal>
</template>

<script setup>
import { mainStore } from "@/store";

const store = mainStore();
const router = useRouter();
const { site } = useData();

const keyword = ref("");
const searchInput = ref(null);
const searchIndex = ref([]);
const loading = ref(false);
const errorMessage = ref("");
const currentPage = ref(0);
const processingTimeMS = ref(0);
const pageSize = 8;

const hasSearchValue = computed(() => keyword.value.trim().length > 0);

const normalize = (value) => {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
};

const searchTerms = computed(() => {
  const normalized = normalize(keyword.value);
  if (!normalized) return [];
  const terms = normalized.split(" ").filter(Boolean);
  return [...new Set(terms.length > 1 ? [normalized, ...terms] : terms)];
});

const escapeHtml = (value) => {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const highlight = (value, terms) => {
  const text = String(value || "");
  if (!text || !terms.length) return escapeHtml(text);

  const lowerText = text.toLowerCase();
  const ranges = [];

  for (const term of [...terms].sort((a, b) => b.length - a.length)) {
    if (!term) continue;
    let start = 0;
    const lowerTerm = term.toLowerCase();
    while (start < lowerText.length) {
      const index = lowerText.indexOf(lowerTerm, start);
      if (index === -1) break;
      ranges.push([index, index + term.length]);
      start = index + term.length;
    }
  }

  if (!ranges.length) return escapeHtml(text);

  const mergedRanges = ranges
    .sort((a, b) => a[0] - b[0])
    .reduce((result, range) => {
      const last = result[result.length - 1];
      if (!last || range[0] > last[1]) {
        result.push(range);
      } else {
        last[1] = Math.max(last[1], range[1]);
      }
      return result;
    }, []);

  let html = "";
  let cursor = 0;
  for (const [start, end] of mergedRanges) {
    html += escapeHtml(text.slice(cursor, start));
    html += `<mark>${escapeHtml(text.slice(start, end))}</mark>`;
    cursor = end;
  }
  html += escapeHtml(text.slice(cursor));
  return html;
};

const createSnippet = (value, terms, maxLength = 140) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;

  const lowerText = text.toLowerCase();
  const matchIndexes = terms
    .map((term) => lowerText.indexOf(term.toLowerCase()))
    .filter((index) => index >= 0);
  const matchIndex = matchIndexes.length ? Math.min(...matchIndexes) : 0;
  const start = Math.max(0, matchIndex - 45);
  const end = Math.min(text.length, start + maxLength);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  return `${prefix}${text.slice(start, end)}${suffix}`;
};

const getFieldScore = (value, terms, weight) => {
  const normalized = normalize(value);
  if (!normalized) return 0;

  return terms.reduce((score, term) => {
    if (!normalized.includes(term)) return score;
    return score + weight + (normalized.startsWith(term) ? weight / 2 : 0);
  }, 0);
};

const includesAnyTerm = (value, terms) => {
  const normalized = normalize(value);
  return terms.some((term) => normalized.includes(term));
};

const getSnippetSource = (item, terms) => {
  if (includesAnyTerm(item.description, terms)) return item.description;
  if (includesAnyTerm(item.content, terms)) return item.content;
  return item.description || item.content;
};

const searchResults = computed(() => {
  if (!hasSearchValue.value || loading.value || errorMessage.value) return [];

  const startTime = performance.now();
  const terms = searchTerms.value;
  const results = searchIndex.value
    .map((item) => {
      const metaText = [...(item.tags || []), ...(item.categories || [])].join(" ");
      const score =
        getFieldScore(item.title, terms, 100) +
        getFieldScore(metaText, terms, 60) +
        getFieldScore(item.description, terms, 40) +
        getFieldScore(item.content, terms, 10);

      return { item, metaText, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || (b.item.date || 0) - (a.item.date || 0))
    .map(({ item, metaText }) => {
      const snippet = createSnippet(getSnippetSource(item, terms), terms);

      return {
        id: item.id,
        url: item.url,
        title: highlight(item.title, terms),
        meta: metaText ? highlight(metaText, terms) : "",
        content: snippet ? highlight(snippet, terms) : "",
      };
    });

  processingTimeMS.value = Math.max(0, Math.round(performance.now() - startTime));
  return results;
});

const totalPages = computed(() => Math.ceil(searchResults.value.length / pageSize));
const pageNumbers = computed(() => Array.from({ length: totalPages.value }, (_, index) => index));
const pagedResults = computed(() => {
  const start = currentPage.value * pageSize;
  return searchResults.value.slice(start, start + pageSize);
});

const loadSearchIndex = async () => {
  if (searchIndex.value.length || loading.value) return;

  loading.value = true;
  errorMessage.value = "";
  try {
    const response = await fetch(`${site.value.base}search-index.json`);
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.includes("application/json")) {
      throw new Error("搜索索引未生成或响应格式错误");
    }
    searchIndex.value = await response.json();
  } catch (error) {
    errorMessage.value = error.message || "搜索索引加载失败";
  } finally {
    loading.value = false;
  }
};

const jumpSearch = (url) => {
  store.changeShowStatus("searchShow");
  router.go(url);
};

watch(
  () => store.searchShow,
  async (show) => {
    if (!show) return;
    await loadSearchIndex();
    await nextTick();
    searchInput.value?.focus();
  },
);

watch(keyword, () => {
  currentPage.value = 0;
});

watch(totalPages, (pages) => {
  if (pages > 0 && currentPage.value >= pages) currentPage.value = pages - 1;
});
</script>

<style lang="scss">
.ais-InstantSearch {
  height: 100%;
  .ais-SearchBox {
    height: 40px;
    width: 100%;
    .ais-SearchBox-input {
      width: 100%;
      outline: none;
      border-radius: 8px;
      font-size: 16px;
      padding: 0.6rem 1rem;
      color: var(--main-font-color);
      font-family: var(--main-font-family);
      border: 1px solid var(--main-card-border);
      background-color: var(--main-card-second-background);
      transition:
        border-color 0.3s,
        box-shadow 0.3s;
      &:focus {
        border-color: var(--main-color);
        box-shadow: 0 8px 16px -4px var(--main-color-bg);
      }
      &::-webkit-search-cancel-button {
        display: none;
      }
    }
    .ais-SearchBox-loadingIndicator,
    .ais-SearchBox-submit,
    .ais-SearchBox-reset {
      display: none;
    }
  }
  .ais-Hits {
    margin-top: 20px;
    min-height: 300px;
    height: 100%;
    .no-result {
      height: 300px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      .iconfont {
        font-size: 40px;
        margin-bottom: 12px;
      }
      .text {
        font-size: 18px;
        opacity: 0.6;
      }
    }
    .search-list {
      .search-item {
        margin-bottom: 12px;
        .title {
          display: inline;
          font-size: 16px;
          margin-bottom: 6px;
        }
        .anchor {
          margin-top: 6px;
          color: var(--main-font-second-color);
          font-size: 14px;
          &::before {
            content: "# ";
          }
        }
        .content {
          color: var(--main-font-second-color);
          margin-top: 0.8rem;
          font-size: 12px;
          padding: 8px;
          border-radius: 8px;
        }
        p {
          margin: 0;
          mark {
            background-color: transparent;
            color: var(--main-color);
          }
        }
        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }
  .ais-Pagination {
    margin-top: 20px;
    .ais-Pagination-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      .ais-Pagination-item {
        margin: 0 4px;
        width: 30px;
        height: 30px;
        border-radius: 8px;
        transition: background-color 0.3s;
        cursor: pointer;
        .ais-Pagination-link {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          padding: 0;
          border: none;
          outline: none;
          color: inherit;
          cursor: pointer;
          font: inherit;
          background: transparent;
          &:hover {
            color: var(--main-font-color);
          }
        }
        &:hover {
          color: var(--main-font-color);
          background-color: var(--main-color);
          .ais-Pagination-link {
            color: var(--main-card-border);
          }
        }
        &.ais-Pagination-item--selected {
          font-weight: bold;
          background-color: var(--main-color);
          .ais-Pagination-link {
            color: var(--main-card-border);
          }
        }
        &.ais-Pagination-item--disabled,
        &.ais-Pagination-item--nextPage,
        &.ais-Pagination-item--lastPage {
          opacity: 0.8;
        }
      }
    }
  }
  .ais-Stats {
    display: flex;
    align-items: center;
    flex-direction: row;
    justify-content: space-between;
    margin-top: 20px;
    opacity: 0.8;
    font-size: 14px;
    .power {
      display: flex;
      flex-direction: row;
      align-items: center;
      font-size: 16px;
      opacity: 0.6;
      transition:
        color 0.3s,
        opacity 0.3s;
      .iconfont {
        margin-right: 4px;
        font-size: 20px;
        transition: color 0.3s;
      }
      .name {
        font-weight: bold;
      }
      &:hover {
        opacity: 1;
        color: var(--main-color);
        .iconfont {
          color: var(--main-color);
        }
      }
    }
    @media (max-width: 512px) {
      justify-content: center;
      .information {
        display: none;
      }
    }
  }
}
</style>

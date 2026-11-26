/* Main backend program */
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define EXPORT_API EMSCRIPTEN_KEEPALIVE
#else
#define EXPORT_API
#endif

#include "catalog.h"
#include "trie.h"

#define MAX_SEARCH_HISTORY 2000
#define ERROR_MSG_SIZE 192

typedef enum {
    SEARCH_STATUS_MATCH = 1,
    SEARCH_STATUS_NO_MATCH = 0,
    SEARCH_STATUS_NOT_INDEXED = -1,
    SEARCH_STATUS_INVALID_INPUT = -2,
    SEARCH_STATUS_QUERY_LIMIT = -3
} SearchStatus;

typedef struct {
    char prefix[TITLE_BUFFER_SIZE];
    char suffix[TITLE_BUFFER_SIZE];
    int resultId;
    char resultTitle[TITLE_BUFFER_SIZE];
    int steps;
    double timeUs;
    int status;
} SearchHistoryEntry;

typedef struct {
    struct Catalog catalog;
    Trie trie;
    int isIndexed;
    double indexBuildTimeMs;
    int queriesProcessed;
    SearchHistoryEntry history[MAX_SEARCH_HISTORY];
    int historyCount;
    int lastSearchStatus;
    int lastSearchId;
    char lastSearchTitle[TITLE_BUFFER_SIZE];
    int lastSearchSteps;
    double lastSearchTimeUs;
    char lastError[ERROR_MSG_SIZE];
    int initialized;
} LibraryEngine;

static LibraryEngine g_engine;

static void appCopyStr(char *dest, const char *src, int maxChars) {
    int i = 0;
    if (dest == NULL || maxChars < 0) {
        return;
    }
    if (src == NULL) {
        dest[0] = '\0';
        return;
    }
    while (i < maxChars && src[i] != '\0') {
        dest[i] = src[i];
        i++;
    }
    dest[i] = '\0';
}

static double appNowMs(void) {
#ifdef __EMSCRIPTEN__
    return emscripten_get_now();
#else
    return ((double)clock() * 1000.0) / (double)CLOCKS_PER_SEC;
#endif
}

static void appInvalidateIndex(void) {
    freeTrie(&g_engine.trie);
    g_engine.isIndexed = 0;
    g_engine.indexBuildTimeMs = 0.0;
}

static void appClearLastSearch(void) {
    g_engine.lastSearchStatus = SEARCH_STATUS_NO_MATCH;
    g_engine.lastSearchId = -1;
    g_engine.lastSearchTitle[0] = '\0';
    g_engine.lastSearchSteps = 0;
    g_engine.lastSearchTimeUs = 0.0;
}

static int appValidateClue(const char *clue, int isPrefix) {
    int len = 0;
    if (clue == NULL || clue[0] == '\0') {
        appCopyStr(g_engine.lastError,
                   isPrefix ? "Prefix cannot be empty. Both beginning and ending clues are required."
                            : "Suffix cannot be empty. Both beginning and ending clues are required.",
                   ERROR_MSG_SIZE - 1);
        return 0;
    }
    while (clue[len] != '\0') {
        char ch = clue[len];
        if (ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r') {
            appCopyStr(g_engine.lastError,
                       isPrefix ? "Prefix must be a single word without spaces."
                                : "Suffix must be a single word without spaces.",
                       ERROR_MSG_SIZE - 1);
            return 0;
        }
        if (ch >= 'A' && ch <= 'Z') {
            appCopyStr(g_engine.lastError,
                       isPrefix ? "Prefix must contain lowercase letters only (uppercase rejected)."
                                : "Suffix must contain lowercase letters only (uppercase rejected).",
                       ERROR_MSG_SIZE - 1);
            return 0;
        }
        if (ch < 'a' || ch > 'z') {
            appCopyStr(g_engine.lastError,
                       isPrefix ? "Prefix contains numbers or special characters; only lowercase a-z allowed."
                                : "Suffix contains numbers or special characters; only lowercase a-z allowed.",
                       ERROR_MSG_SIZE - 1);
            return 0;
        }
        len++;
        if (len > MAX_TITLE_LENGTH) {
            appCopyStr(g_engine.lastError,
                       isPrefix ? "Prefix exceeds maximum length of 8 characters."
                                : "Suffix exceeds maximum length of 8 characters.",
                       ERROR_MSG_SIZE - 1);
            return 0;
        }
    }
    return 1;
}

EXPORT_API void api_init(void) {
    if (g_engine.initialized) {
        freeTrie(&g_engine.trie);
    }
    initializeCatalog(&g_engine.catalog);
    g_engine.trie.root = NULL;
    g_engine.trie.nodeCount = 0;
    g_engine.trie.indexedWordCount = 0;
    g_engine.isIndexed = 0;
    g_engine.indexBuildTimeMs = 0.0;
    g_engine.queriesProcessed = 0;
    g_engine.historyCount = 0;
    g_engine.lastError[0] = '\0';
    appClearLastSearch();
    g_engine.initialized = 1;
}

EXPORT_API void api_reset_catalog(void) {
    if (!g_engine.initialized) {
        api_init();
    }
    appInvalidateIndex();
    initializeCatalog(&g_engine.catalog);
    g_engine.lastError[0] = '\0';
    appClearLastSearch();
}

EXPORT_API int api_load_demo_catalog(void) {
    static const char * const demoTitles[6] = {
        "catalog",
        "catch",
        "catdog",
        "catalog",
        "car",
        "dog"
    };
    int loaded;

    if (!g_engine.initialized) {
        api_init();
    }
    appInvalidateIndex();
    loaded = loadCatalog(&g_engine.catalog, demoTitles, 6);
    g_engine.lastError[0] = '\0';
    appClearLastSearch();
    return loaded;
}

EXPORT_API int api_load_stress_catalog(void) {
    static const char * const prefixes[10] = {
        "cat", "dog", "lib", "book", "code", "algo", "data", "tree", "node", "byte"
    };
    static const char * const suffixes[10] = {
        "log", "ch", "dog", "er", "ex", "ar", "in", "on", "ix", "os"
    };
    int i;
    char word[TITLE_BUFFER_SIZE];

    if (!g_engine.initialized) {
        api_init();
    }
    appInvalidateIndex();
    initializeCatalog(&g_engine.catalog);

    for (i = 0; i < MAX_CATALOG_RECORDS; i++) {
        const char *p = prefixes[i % 10];
        const char *s = suffixes[(i / 10) % 10];
        int midIdx = (i / 100) % 10;
        char midChar = (char)('a' + midIdx);
        int pos = 0;
        int j = 0;

        while (p[j] != '\0' && pos < MAX_TITLE_LENGTH) {
            word[pos++] = p[j++];
        }
        if (pos < MAX_TITLE_LENGTH) {
            word[pos++] = midChar;
        }
        j = 0;
        while (s[j] != '\0' && pos < MAX_TITLE_LENGTH) {
            word[pos++] = s[j++];
        }
        word[pos] = '\0';

        (void)addRecord(&g_engine.catalog, word);
    }

    g_engine.lastError[0] = '\0';
    appClearLastSearch();
    return getCatalogCount(&g_engine.catalog);
}

EXPORT_API int api_add_record(const char *title) {
    int assignedId = -1;
    CatalogStatus status;

    if (!g_engine.initialized) {
        api_init();
    }

    status = addRecordDetailed(&g_engine.catalog, title, &assignedId);
    if (status != CATALOG_OK) {
        appCopyStr(g_engine.lastError, getCatalogStatusMessage(status), ERROR_MSG_SIZE - 1);
        return -1;
    }

    appInvalidateIndex();
    g_engine.lastError[0] = '\0';
    return assignedId;
}

EXPORT_API const char *api_get_last_error(void) {
    return g_engine.lastError;
}

EXPORT_API int api_get_catalog_count(void) {
    if (!g_engine.initialized) {
        return 0;
    }
    return getCatalogCount(&g_engine.catalog);
}

EXPORT_API const char *api_get_record_title(int id) {
    const char *title;
    if (!g_engine.initialized) {
        return "";
    }
    title = getTitleByID(&g_engine.catalog, id);
    return (title != NULL) ? title : "";
}

EXPORT_API int api_build_index(void) {
    int count;
    int i;
    double startMs;
    double endMs;

    if (!g_engine.initialized) {
        api_init();
    }

    if (g_engine.isIndexed) {
        g_engine.lastError[0] = '\0';
        return 2;
    }

    freeTrie(&g_engine.trie);
    if (!initializeTrie(&g_engine.trie)) {
        appCopyStr(g_engine.lastError, "Memory allocation failed while initializing Trie.", ERROR_MSG_SIZE - 1);
        g_engine.isIndexed = 0;
        return 0;
    }

    count = getCatalogCount(&g_engine.catalog);
    startMs = appNowMs();

    for (i = 0; i < count; i++) {
        const char *title = getTitleByID(&g_engine.catalog, i);
        if (title == NULL || !insertWord(&g_engine.trie, title, i)) {
            freeTrie(&g_engine.trie);
            appCopyStr(g_engine.lastError, "Failed while inserting catalog word into Trie.", ERROR_MSG_SIZE - 1);
            g_engine.isIndexed = 0;
            return 0;
        }
    }

    endMs = appNowMs();
    g_engine.indexBuildTimeMs = endMs - startMs;
    if (g_engine.indexBuildTimeMs < 0.0) {
        g_engine.indexBuildTimeMs = 0.0;
    }
    g_engine.isIndexed = 1;
    g_engine.lastError[0] = '\0';
    return 1;
}

EXPORT_API int api_is_indexed(void) {
    return g_engine.initialized ? g_engine.isIndexed : 0;
}

EXPORT_API int api_get_indexed_count(void) {
    if (!g_engine.initialized || !g_engine.isIndexed) {
        return 0;
    }
    return g_engine.trie.indexedWordCount;
}

EXPORT_API int api_get_trie_node_count(void) {
    if (!g_engine.initialized || !g_engine.isIndexed) {
        return 0;
    }
    return g_engine.trie.nodeCount;
}

EXPORT_API double api_get_index_time_ms(void) {
    if (!g_engine.initialized || !g_engine.isIndexed) {
        return 0.0;
    }
    return g_engine.indexBuildTimeMs;
}

EXPORT_API int api_get_queries_processed(void) {
    return g_engine.initialized ? g_engine.queriesProcessed : 0;
}

EXPORT_API int api_search(const char *prefix, const char *suffix) {
    double startMs;
    double endMs;
    int steps = 0;
    int matchId;
    const char *matchedTitle;
    SearchHistoryEntry *entry;

    if (!g_engine.initialized) {
        api_init();
    }

    appClearLastSearch();

    if (!g_engine.isIndexed) {
        g_engine.lastSearchStatus = SEARCH_STATUS_NOT_INDEXED;
        appCopyStr(g_engine.lastError,
                   "Index has not been built yet (or catalog changed). Build the Trie index before searching.",
                   ERROR_MSG_SIZE - 1);
        return -2;
    }

    if (g_engine.queriesProcessed >= MAX_SEARCH_HISTORY) {
        g_engine.lastSearchStatus = SEARCH_STATUS_QUERY_LIMIT;
        appCopyStr(g_engine.lastError,
                   "Maximum query capacity (2,000 queries) reached. Clear search history to continue.",
                   ERROR_MSG_SIZE - 1);
        return -4;
    }

    if (!appValidateClue(prefix, 1)) {
        g_engine.lastSearchStatus = SEARCH_STATUS_INVALID_INPUT;
        return -3;
    }
    if (!appValidateClue(suffix, 0)) {
        g_engine.lastSearchStatus = SEARCH_STATUS_INVALID_INPUT;
        return -3;
    }

    startMs = appNowMs();
    matchId = searchWordWithSteps(&g_engine.trie, prefix, suffix, &steps);
    endMs = appNowMs();

    g_engine.lastSearchTimeUs = (endMs - startMs) * 1000.0;
    if (g_engine.lastSearchTimeUs < 0.0) {
        g_engine.lastSearchTimeUs = 0.0;
    }
    g_engine.lastSearchSteps = steps;
    g_engine.lastSearchId = matchId;
    g_engine.queriesProcessed++;

    if (matchId >= 0) {
        matchedTitle = getTitleByID(&g_engine.catalog, matchId);
        if (matchedTitle != NULL) {
            appCopyStr(g_engine.lastSearchTitle, matchedTitle, MAX_TITLE_LENGTH);
        }
        g_engine.lastSearchStatus = SEARCH_STATUS_MATCH;
        g_engine.lastError[0] = '\0';
    } else {
        g_engine.lastSearchStatus = SEARCH_STATUS_NO_MATCH;
        appCopyStr(g_engine.lastError,
                   "Oops! We couldn't find a book matching both clues. Try another combination!",
                   ERROR_MSG_SIZE - 1);
    }

    if (g_engine.historyCount < MAX_SEARCH_HISTORY) {
        entry = &g_engine.history[g_engine.historyCount++];
        appCopyStr(entry->prefix, prefix, MAX_TITLE_LENGTH);
        appCopyStr(entry->suffix, suffix, MAX_TITLE_LENGTH);
        entry->resultId = matchId;
        appCopyStr(entry->resultTitle, g_engine.lastSearchTitle, MAX_TITLE_LENGTH);
        entry->steps = steps;
        entry->timeUs = g_engine.lastSearchTimeUs;
        entry->status = g_engine.lastSearchStatus;
    }

    return (matchId >= 0) ? matchId : -1;
}

EXPORT_API int api_get_last_search_status(void) {
    return g_engine.lastSearchStatus;
}

EXPORT_API int api_get_last_search_id(void) {
    return g_engine.lastSearchId;
}

EXPORT_API const char *api_get_last_search_title(void) {
    return g_engine.lastSearchTitle;
}

EXPORT_API int api_get_last_search_steps(void) {
    return g_engine.lastSearchSteps;
}

EXPORT_API double api_get_last_search_time_us(void) {
    return g_engine.lastSearchTimeUs;
}

EXPORT_API int api_get_history_count(void) {
    return g_engine.initialized ? g_engine.historyCount : 0;
}

EXPORT_API const char *api_get_history_prefix(int idx) {
    if (!g_engine.initialized || idx < 0 || idx >= g_engine.historyCount) {
        return "";
    }
    return g_engine.history[idx].prefix;
}

EXPORT_API const char *api_get_history_suffix(int idx) {
    if (!g_engine.initialized || idx < 0 || idx >= g_engine.historyCount) {
        return "";
    }
    return g_engine.history[idx].suffix;
}

EXPORT_API int api_get_history_id(int idx) {
    if (!g_engine.initialized || idx < 0 || idx >= g_engine.historyCount) {
        return -1;
    }
    return g_engine.history[idx].resultId;
}

EXPORT_API const char *api_get_history_title(int idx) {
    if (!g_engine.initialized || idx < 0 || idx >= g_engine.historyCount) {
        return "";
    }
    return g_engine.history[idx].resultTitle;
}

EXPORT_API int api_get_history_steps(int idx) {
    if (!g_engine.initialized || idx < 0 || idx >= g_engine.historyCount) {
        return 0;
    }
    return g_engine.history[idx].steps;
}

EXPORT_API void api_clear_history(void) {
    if (!g_engine.initialized) {
        return;
    }
    g_engine.historyCount = 0;
    g_engine.queriesProcessed = 0;
}

EXPORT_API void api_shutdown(void) {
    if (!g_engine.initialized) {
        return;
    }
    freeTrie(&g_engine.trie);
    initializeCatalog(&g_engine.catalog);
    g_engine.isIndexed = 0;
    g_engine.initialized = 0;
}

#if defined(SERVER_BRIDGE)

static int bridgeStartsWith(const char *str, const char *prefix) {
    int i = 0;
    while (prefix[i] != '\0') {
        if (str[i] != prefix[i]) {
            return 0;
        }
        i++;
    }
    return 1;
}

static int bridgeStrEq(const char *a, const char *b) {
    int i = 0;
    while (a[i] != '\0' && b[i] != '\0') {
        if (a[i] != b[i]) {
            return 0;
        }
        i++;
    }
    return a[i] == b[i];
}

static void bridgePrintJsonEscaped(const char *s) {
    int i = 0;
    putchar('"');
    if (s != NULL) {
        while (s[i] != '\0') {
            unsigned char c = (unsigned char)s[i];
            if (c == '"') {
                printf("\\\"");
            } else if (c == '\\') {
                printf("\\\\");
            } else if (c == '\n') {
                printf("\\n");
            } else if (c == '\r') {
                printf("\\r");
            } else if (c == '\t') {
                printf("\\t");
            } else if (c < 0x20) {
                printf("\\u%04x", (unsigned int)c);
            } else {
                putchar((int)c);
            }
            i++;
        }
    }
    putchar('"');
}

static void bridgePrintStateFields(void) {
    printf("\"catalogCount\":%d,", api_get_catalog_count());
    printf("\"isIndexed\":%s,", api_is_indexed() ? "true" : "false");
    printf("\"indexedCount\":%d,", api_get_indexed_count());
    printf("\"trieNodeCount\":%d,", api_get_trie_node_count());
    printf("\"indexBuildTimeMs\":%.6f,", api_get_index_time_ms());
    printf("\"queriesProcessed\":%d,", api_get_queries_processed());
    printf("\"historyCount\":%d", api_get_history_count());
}

static void bridgePrintCatalogArray(void) {
    int i;
    int count = api_get_catalog_count();
    putchar('[');
    for (i = 0; i < count; i++) {
        if (i > 0) putchar(',');
        printf("{\"id\":%d,\"order\":%d,\"title\":", i, i + 1);
        bridgePrintJsonEscaped(api_get_record_title(i));
        putchar('}');
    }
    putchar(']');
}

static void bridgePrintHistoryArray(void) {
    int i;
    int hCount = api_get_history_count();
    putchar('[');
    for (i = hCount - 1; i >= 0; i--) {
        if (i < hCount - 1) putchar(',');
        printf("{\"index\":%d,\"prefix\":", i + 1);
        bridgePrintJsonEscaped(api_get_history_prefix(i));
        printf(",\"suffix\":");
        bridgePrintJsonEscaped(api_get_history_suffix(i));
        printf(",\"resultId\":%d,\"resultTitle\":", api_get_history_id(i));
        bridgePrintJsonEscaped(api_get_history_title(i));
        printf(",\"steps\":%d,\"timeUs\":%.3f}",
               api_get_history_steps(i),
               g_engine.history[i].timeUs);
    }
    putchar(']');
}

static void bridgeTrimLineEnd(char *buf) {
    int i = 0;
    while (buf[i] != '\0') {
        if (buf[i] == '\n' || buf[i] == '\r') {
            buf[i] = '\0';
            return;
        }
        i++;
    }
}

int main(void) {
    char line[512];
    api_init();
    api_load_demo_catalog();
    api_build_index();

    while (fgets(line, (int)sizeof(line), stdin) != NULL) {
        bridgeTrimLineEnd(line);

        if (bridgeStrEq(line, "QUIT")) {
            break;
        } else if (bridgeStrEq(line, "INIT")) {
            api_init();
            printf("{\"ok\":true,");
            bridgePrintStateFields();
            printf("}\n");
        } else if (bridgeStrEq(line, "STATE")) {
            printf("{\"ok\":true,");
            bridgePrintStateFields();
            printf(",\"catalog\":");
            bridgePrintCatalogArray();
            printf(",\"history\":");
            bridgePrintHistoryArray();
            printf("}\n");
        } else if (bridgeStrEq(line, "LOAD_DEMO")) {
            int n = api_load_demo_catalog();
            printf("{\"ok\":true,\"loaded\":%d,", n);
            bridgePrintStateFields();
            printf(",\"catalog\":");
            bridgePrintCatalogArray();
            printf("}\n");
        } else if (bridgeStrEq(line, "LOAD_STRESS")) {
            int n = api_load_stress_catalog();
            printf("{\"ok\":true,\"loaded\":%d,", n);
            bridgePrintStateFields();
            printf(",\"catalog\":");
            bridgePrintCatalogArray();
            printf("}\n");
        } else if (bridgeStrEq(line, "RESET")) {
            api_reset_catalog();
            printf("{\"ok\":true,");
            bridgePrintStateFields();
            printf(",\"catalog\":[]}\n");
        } else if (bridgeStartsWith(line, "ADD\t")) {
            const char *title = line + 4;
            int id = api_add_record(title);
            if (id >= 0) {
                printf("{\"ok\":true,\"id\":%d,\"title\":", id);
                bridgePrintJsonEscaped(api_get_record_title(id));
                printf(",");
                bridgePrintStateFields();
                printf(",\"catalog\":");
                bridgePrintCatalogArray();
                printf("}\n");
            } else {
                printf("{\"ok\":false,\"error\":");
                bridgePrintJsonEscaped(api_get_last_error());
                printf(",");
                bridgePrintStateFields();
                printf("}\n");
            }
        } else if (bridgeStrEq(line, "BUILD")) {
            int res = api_build_index();
            printf("{\"ok\":%s,\"buildCode\":%d,\"error\":",
                   res >= 1 ? "true" : "false", res);
            bridgePrintJsonEscaped(api_get_last_error());
            printf(",");
            bridgePrintStateFields();
            printf("}\n");
        } else if (bridgeStartsWith(line, "SEARCH\t")) {
            char *pStart = line + 7;
            char *sep = pStart;
            int res;
            while (*sep != '\0' && *sep != '\t') {
                sep++;
            }
            if (*sep == '\t') {
                *sep = '\0';
                sep++;
            } else {
                sep = "";
            }
            res = api_search(pStart, sep);
            printf("{\"ok\":%s,\"code\":%d,\"resultId\":%d,\"resultTitle\":",
                   res >= 0 ? "true" : "false",
                   res,
                   api_get_last_search_id());
            bridgePrintJsonEscaped(api_get_last_search_title());
            printf(",\"steps\":%d,\"timeUs\":%.3f,\"error\":",
                   api_get_last_search_steps(),
                   api_get_last_search_time_us());
            bridgePrintJsonEscaped(api_get_last_error());
            printf(",");
            bridgePrintStateFields();
            printf(",\"history\":");
            bridgePrintHistoryArray();
            printf("}\n");
        } else if (bridgeStrEq(line, "CLEAR_HISTORY")) {
            api_clear_history();
            printf("{\"ok\":true,");
            bridgePrintStateFields();
            printf(",\"history\":[]}\n");
        } else {
            printf("{\"ok\":false,\"error\":\"Unknown bridge command.\"}\n");
        }
        fflush(stdout);
    }

    api_shutdown();
    return 0;
}

#elif !defined(__EMSCRIPTEN__) && !defined(TEST_MODE)
static void readLineTrimmed(char *buffer, int size) {
    int len = 0;
    int ch;
    if (fgets(buffer, size, stdin) == NULL) {
        buffer[0] = '\0';
        return;
    }
    while (buffer[len] != '\0') {
        if (buffer[len] == '\n' || buffer[len] == '\r') {
            buffer[len] = '\0';
            return;
        }
        len++;
    }
    while ((ch = getchar()) != '\n' && ch != EOF) {
        /* flush remainder of long input line */
    }
}

int main(void) {
    char inputBuf[64];
    char prefixBuf[64];
    char suffixBuf[64];
    int running = 1;

    api_init();
    printf("==================================================\n");
    printf("  THE HALF-REMEMBERED LIBRARY (C Trie Backend)\n");
    printf("==================================================\n");

    while (running) {
        int choice = -1;
        printf("\nMenu:\n");
        printf("  1. Load Hackathon Demo Catalog (6 records)\n");
        printf("  2. Add Catalog Record\n");
        printf("  3. Display Catalog\n");
        printf("  4. Build Trie Index\n");
        printf("  5. Search by Prefix & Suffix\n");
        printf("  6. View Search History\n");
        printf("  7. View Indexing Statistics\n");
        printf("  8. Load 1,000-Record Stress Catalog\n");
        printf("  9. Clear Catalog\n");
        printf("  0. Exit\n");
        printf("Choice: ");

        readLineTrimmed(inputBuf, (int)sizeof(inputBuf));
        if (inputBuf[0] == '\0') {
            if (feof(stdin)) {
                break;
            }
            continue;
        }
        if (inputBuf[0] < '0' || inputBuf[0] > '9' || inputBuf[1] != '\0') {
            printf("Invalid menu option.\n");
            continue;
        }
        choice = (int)(inputBuf[0] - '0');

        switch (choice) {
            case 1: {
                int loaded = api_load_demo_catalog();
                printf("Loaded %d demo records. Index invalidated; build index before searching.\n", loaded);
                break;
            }
            case 2: {
                int id;
                printf("Enter lowercase single-word title (max 8 chars): ");
                readLineTrimmed(inputBuf, (int)sizeof(inputBuf));
                id = api_add_record(inputBuf);
                if (id >= 0) {
                    printf("Added '%s' with ID %d. Index invalidated.\n", inputBuf, id);
                } else {
                    printf("Rejected: %s\n", api_get_last_error());
                }
                break;
            }
            case 3:
                displayCatalog(&g_engine.catalog);
                break;
            case 4: {
                int res = api_build_index();
                if (res == 1) {
                    printf("Trie index built! Indexed %d records into %d nodes in %.3f ms.\n",
                           api_get_indexed_count(), api_get_trie_node_count(), api_get_index_time_ms());
                } else if (res == 2) {
                    printf("Index is already up-to-date (built once; catalog unchanged).\n");
                } else {
                    printf("Indexing failed: %s\n", api_get_last_error());
                }
                break;
            }
            case 5: {
                int res;
                printf("Enter Prefix (beginning): ");
                readLineTrimmed(prefixBuf, (int)sizeof(prefixBuf));
                printf("Enter Suffix (ending): ");
                readLineTrimmed(suffixBuf, (int)sizeof(suffixBuf));
                res = api_search(prefixBuf, suffixBuf);
                if (res >= 0) {
                    printf("MATCH FOUND -> Title: %s | Record ID: %d | Trie Steps: %d | Time: %.2f us\n",
                           api_get_last_search_title(), res,
                           api_get_last_search_steps(), api_get_last_search_time_us());
                } else if (res == -1) {
                    printf("NO MATCH -> %s (Trie Steps: %d)\n",
                           api_get_last_error(), api_get_last_search_steps());
                } else {
                    printf("ERROR -> %s\n", api_get_last_error());
                }
                break;
            }
            case 6: {
                int i;
                int hCount = api_get_history_count();
                printf("\n--- SEARCH HISTORY (%d entries) ---\n", hCount);
                for (i = 0; i < hCount; i++) {
                    int hid = api_get_history_id(i);
                    if (hid >= 0) {
                        printf("  %d) %s + %s -> %s (ID %d, %d steps)\n",
                               i + 1, api_get_history_prefix(i), api_get_history_suffix(i),
                               api_get_history_title(i), hid, api_get_history_steps(i));
                    } else {
                        printf("  %d) %s + %s -> No Match (%d steps)\n",
                               i + 1, api_get_history_prefix(i), api_get_history_suffix(i),
                               api_get_history_steps(i));
                    }
                }
                break;
            }
            case 7:
                printf("\n--- INDEXING STATISTICS ---\n");
                printf("  Catalog records   : %d\n", api_get_catalog_count());
                printf("  Index status      : %s\n", api_is_indexed() ? "Built & Ready" : "Not Built / Stale");
                printf("  Indexed titles    : %d\n", api_get_indexed_count());
                printf("  Trie nodes        : %d\n", api_get_trie_node_count());
                printf("  Build time        : %.3f ms\n", api_get_index_time_ms());
                printf("  Queries processed : %d\n", api_get_queries_processed());
                break;
            case 8: {
                int loaded = api_load_stress_catalog();
                printf("Loaded %d benchmark records. Build index to measure O(N * L^2) construction.\n", loaded);
                break;
            }
            case 9:
                api_reset_catalog();
                printf("Catalog cleared and index invalidated.\n");
                break;
            case 0:
                running = 0;
                break;
            default:
                printf("Invalid menu option.\n");
                break;
        }
    }

    api_shutdown();
    printf("Memory freed. Goodbye!\n");
    return 0;
}
#endif /* SERVER_BRIDGE / CLI */

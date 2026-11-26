/* Backend test cases */
#include <stdio.h>
#include <assert.h>
#include "catalog.h"
#include "trie.h"

void api_init(void);
void api_reset_catalog(void);
int api_load_demo_catalog(void);
int api_load_stress_catalog(void);
int api_add_record(const char *title);
const char *api_get_last_error(void);
int api_get_catalog_count(void);
const char *api_get_record_title(int id);
int api_build_index(void);
int api_is_indexed(void);
int api_get_indexed_count(void);
int api_get_trie_node_count(void);
double api_get_index_time_ms(void);
int api_get_queries_processed(void);
int api_search(const char *prefix, const char *suffix);
const char *api_get_last_search_title(void);
int api_get_last_search_steps(void);
void api_clear_history(void);
void api_shutdown(void);

static int strEq(const char *a, const char *b) {
    int i = 0;
    if (a == NULL || b == NULL) {
        return a == b;
    }
    while (a[i] != '\0' && b[i] != '\0') {
        if (a[i] != b[i]) {
            return 0;
        }
        i++;
    }
    return a[i] == b[i];
}

static void testCatalogModule(void) {
    struct Catalog cat;
    int id0, id1, id2;

    printf("[TEST] Catalog validation, sequential IDs, duplicates, limits...\n");
    initializeCatalog(&cat);
    assert(getCatalogCount(&cat) == 0);
    assert(getTitleByID(&cat, 0) == NULL);

    assert(validateTitle(NULL) == 0);
    assert(validateTitle("") == 0);
    assert(validateTitle("Catalog") == 0);
    assert(validateTitle("cat1") == 0);
    assert(validateTitle("cat-dog") == 0);
    assert(validateTitle("cat#dog") == 0);
    assert(validateTitle("cat dog") == 0);
    assert(validateTitle("ninechars") == 0);
    assert(validateTitle("eightchr") == 1);
    assert(validateTitle("a") == 1);

    id0 = addRecord(&cat, "catalog");
    id1 = addRecord(&cat, "catch");
    id2 = addRecord(&cat, "catalog");
    assert(id0 == 0);
    assert(id1 == 1);
    assert(id2 == 2);
    assert(getCatalogCount(&cat) == 3);
    assert(strEq(getTitleByID(&cat, 0), "catalog"));
    assert(strEq(getTitleByID(&cat, 1), "catch"));
    assert(strEq(getTitleByID(&cat, 2), "catalog"));
    assert(getTitleByID(&cat, 3) == NULL);
    assert(getTitleByID(&cat, -1) == NULL);

    assert(addRecord(&cat, "INVALID") == -1);
    assert(addRecord(&cat, "toolong99") == -1);
    assert(getCatalogCount(&cat) == 3);
}

static void testTrieCoreUnit(void) {
    Trie trie;
    int steps = 0;

    printf("[TEST] Core Trie unit tests...\n");
    assert(characterToIndex('a') == 0);
    assert(characterToIndex('z') == 25);
    assert(characterToIndex('#') == 26);
    assert(characterToIndex('A') == -1);
    assert(characterToIndex('0') == -1);

    assert(initializeTrie(&trie) == 1);
    assert(trie.nodeCount == 1);

    assert(insertWord(&trie, "catalog", 0) == 1);
    assert(insertWord(&trie, "catch", 1) == 1);
    assert(insertWord(&trie, "catdog", 2) == 1);

    assert(searchWordWithSteps(&trie, "cat", "og", &steps) == 2);
    assert(steps == 2 + 1 + 3);

    assert(insertWord(&trie, "catalog", 3) == 1);
    assert(searchWord(&trie, "cat", "og") == 3);
    assert(searchWord(&trie, "cat", "dog") == 2);
    assert(searchWord(&trie, "ca", "ch") == 1);

    assert(searchWord(&trie, "cat", "zz") == -1);
    assert(searchWord(&trie, "zz", "og") == -1);
    assert(searchWord(&trie, "", "og") == -1);
    assert(searchWord(&trie, "cat", "") == -1);
    assert(searchWord(&trie, "Cat", "og") == -1);
    assert(searchWord(&trie, "ca1", "og") == -1);

    freeTrie(&trie);
    assert(trie.root == NULL);
    assert(trie.nodeCount == 0);
}

static void testAll15IntegrationScenarios(void) {
    int i;
    int res;

    printf("[TEST] Integration tests 1-15...\n");

    /* Tests 13 & 14: Empty catalog & search before index construction */
    api_init();
    assert(api_get_catalog_count() == 0);
    assert(api_is_indexed() == 0);
    assert(api_search("cat", "og") == -2);

    assert(api_build_index() == 1);
    assert(api_is_indexed() == 1);
    assert(api_get_indexed_count() == 0);
    assert(api_get_trie_node_count() == 1);
    assert(api_search("cat", "og") == -1);

    /* Demo catalog loading invalidates index */
    assert(api_load_demo_catalog() == 6);
    assert(api_is_indexed() == 0);
    assert(api_search("ca", "ch") == -2);

    assert(api_build_index() == 1);
    assert(api_build_index() == 2); /* Single-build policy */
    assert(api_get_indexed_count() == 6);

    /* Demo Query 1 */
    res = api_search("ca", "ch");
    assert(res == 1);
    assert(strEq(api_get_last_search_title(), "catch"));

    /* Demo Query 2 & Tests 1, 3, 4: latest inserted ID among multiple/duplicate matches */
    res = api_search("cat", "og");
    assert(res == 3);
    assert(strEq(api_get_last_search_title(), "catalog"));

    /* Demo Query 3 */
    res = api_search("cat", "log");
    assert(res == 3);
    assert(strEq(api_get_last_search_title(), "catalog"));

    /* Demo Query 4 & Test 2: No match */
    res = api_search("dog", "cat");
    assert(res == -1);

    /* Demo Query 5 & Test 12: Repeated query */
    res = api_search("cat", "og");
    assert(res == 3);
    assert(api_get_last_search_steps() == 6);

    /* Tests 5 & 6: Prefix-only & suffix-only match */
    assert(api_search("car", "og") == -1);
    assert(api_search("dog", "ar") == -1);

    /* Tests 7, 8, 9, 10: Empty, uppercase, digits, special chars, spaces */
    assert(api_search("", "og") == -3);
    assert(api_search("cat", "") == -3);
    assert(api_search("Cat", "og") == -3);
    assert(api_search("cat", "OG") == -3);
    assert(api_search("ca1", "og") == -3);
    assert(api_search("cat", "o!") == -3);
    assert(api_search("cat dog", "og") == -3);

    /* Test 11: Max length 8 chars + index invalidation on add */
    res = api_add_record("abcdefgh");
    assert(res == 6);
    assert(api_is_indexed() == 0);
    assert(api_add_record("abcdefghi") == -1);
    assert(api_build_index() == 1);
    assert(api_search("abcdefgh", "abcdefgh") == 6);
    assert(strEq(api_get_last_search_title(), "abcdefgh"));
    assert(api_get_last_search_steps() == 17);

    /* Test 15: Full 1,000-record catalog + 2,000 query limit */
    api_clear_history();
    assert(api_load_stress_catalog() == MAX_CATALOG_RECORDS);
    assert(api_get_catalog_count() == 1000);
    assert(api_add_record("overflow") == -1);
    assert(api_is_indexed() == 0);
    assert(api_build_index() == 1);
    assert(api_get_indexed_count() == 1000);
    printf("      1,000 records indexed -> %d Trie nodes in %.3f ms\n",
           api_get_trie_node_count(), api_get_index_time_ms());

    res = api_search("cat", "log");
    assert(res == 900);
    assert(strEq(api_get_last_search_title(), "catjlog"));
    assert(api_get_last_search_steps() == 7);

    for (i = 1; i < 2000; i++) {
        assert(api_search("cat", "log") == 900);
    }
    assert(api_get_queries_processed() == 2000);
    assert(api_search("cat", "log") == -4);

    api_shutdown();
}

int main(void) {
    printf("==================================================\n");
    printf("  RUNNING AUTOMATED TEST SUITE (15 SCENARIOS)\n");
    printf("==================================================\n");
    testCatalogModule();
    testTrieCoreUnit();
    testAll15IntegrationScenarios();
    printf("==================================================\n");
    printf("  ALL TESTS PASSED SUCCESSFULLY!\n");
    printf("==================================================\n");
    return 0;
}

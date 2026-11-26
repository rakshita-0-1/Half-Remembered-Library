#include <stdlib.h>
#include "trie.h"

static int trieValidateLowercaseWord(const char *str, int maxLen) {
    int len = 0;
    if (str == NULL || str[0] == '\0') {
        return -1;
    }
    while (str[len] != '\0') {
        char ch = str[len];
        if (ch < 'a' || ch > 'z') {
            return -1;
        }
        len++;
        if (len > maxLen) {
            return -1;
        }
    }
    return len;
}

TrieNode *createNode(void) {
    TrieNode *node = (TrieNode *)malloc(sizeof(TrieNode));
    int i;
    if (node == NULL) {
        return NULL;
    }
    for (i = 0; i < ALPHABET_SIZE; i++) {
        node->children[i] = NULL;
    }
    node->maxId = -1;
    return node;
}

int initializeTrie(Trie *trie) {
    if (trie == NULL) {
        return 0;
    }
    trie->root = createNode();
    if (trie->root == NULL) {
        trie->nodeCount = 0;
        trie->indexedWordCount = 0;
        return 0;
    }
    trie->nodeCount = 1;
    trie->indexedWordCount = 0;
    return 1;
}

int characterToIndex(char ch) {
    if (ch >= 'a' && ch <= 'z') {
        return (int)(ch - 'a');
    }
    if (ch == TRIE_SEPARATOR) {
        return 26;
    }
    return -1;
}

int insertSequence(Trie *trie, const char *sequence, int wordId) {
    TrieNode *curr;
    int i;

    if (trie == NULL || trie->root == NULL || sequence == NULL || wordId < 0) {
        return 0;
    }

    curr = trie->root;
    if (wordId > curr->maxId) {
        curr->maxId = wordId;
    }

    for (i = 0; sequence[i] != '\0'; i++) {
        int idx = characterToIndex(sequence[i]);
        if (idx < 0 || idx >= ALPHABET_SIZE) {
            return 0;
        }
        if (curr->children[idx] == NULL) {
            TrieNode *child = createNode();
            if (child == NULL) {
                return 0;
            }
            curr->children[idx] = child;
            trie->nodeCount++;
        }
        curr = curr->children[idx];
        if (wordId > curr->maxId) {
            curr->maxId = wordId;
        }
    }
    return 1;
}

int insertWord(Trie *trie, const char *word, int wordId) {
    int len;
    int start;
    char sequence[2 * MAX_TRIE_WORD_LEN + 2];

    if (trie == NULL || trie->root == NULL || wordId < 0) {
        return 0;
    }

    len = trieValidateLowercaseWord(word, MAX_TRIE_WORD_LEN);
    if (len <= 0) {
        return 0;
    }

    /* Generate all suffixes from start = 0..len: suffix + '#' + word */
    for (start = 0; start <= len; start++) {
        int pos = 0;
        int i;

        for (i = start; i < len; i++) {
            sequence[pos++] = word[i];
        }
        sequence[pos++] = TRIE_SEPARATOR;
        for (i = 0; i < len; i++) {
            sequence[pos++] = word[i];
        }
        sequence[pos] = '\0';

        if (!insertSequence(trie, sequence, wordId)) {
            return 0;
        }
    }

    trie->indexedWordCount++;
    return 1;
}

int searchWordWithSteps(const Trie *trie, const char *prefix, const char *suffix, int *stepsOut) {
    const TrieNode *curr;
    int prefixLen;
    int suffixLen;
    int i;
    int sepIdx;
    int steps = 0;

    if (stepsOut != NULL) {
        *stepsOut = 0;
    }

    if (trie == NULL || trie->root == NULL || prefix == NULL || suffix == NULL) {
        return -1;
    }

    prefixLen = trieValidateLowercaseWord(prefix, MAX_TRIE_WORD_LEN);
    suffixLen = trieValidateLowercaseWord(suffix, MAX_TRIE_WORD_LEN);
    if (prefixLen <= 0 || suffixLen <= 0) {
        return -1;
    }

    curr = trie->root;

    /* Traverse suffix + '#' + prefix without reversing suffix */
    for (i = 0; i < suffixLen; i++) {
        int idx = characterToIndex(suffix[i]);
        steps++;
        if (idx < 0 || curr->children[idx] == NULL) {
            if (stepsOut != NULL) {
                *stepsOut = steps;
            }
            return -1;
        }
        curr = curr->children[idx];
    }

    sepIdx = characterToIndex(TRIE_SEPARATOR);
    steps++;
    if (sepIdx < 0 || curr->children[sepIdx] == NULL) {
        if (stepsOut != NULL) {
            *stepsOut = steps;
        }
        return -1;
    }
    curr = curr->children[sepIdx];

    for (i = 0; i < prefixLen; i++) {
        int idx = characterToIndex(prefix[i]);
        steps++;
        if (idx < 0 || curr->children[idx] == NULL) {
            if (stepsOut != NULL) {
                *stepsOut = steps;
            }
            return -1;
        }
        curr = curr->children[idx];
    }

    if (stepsOut != NULL) {
        *stepsOut = steps;
    }
    return curr->maxId;
}

int searchWord(const Trie *trie, const char *prefix, const char *suffix) {
    return searchWordWithSteps(trie, prefix, suffix, NULL);
}

static void freeTrieNodeRecursive(TrieNode *node) {
    int i;
    if (node == NULL) {
        return;
    }
    for (i = 0; i < ALPHABET_SIZE; i++) {
        if (node->children[i] != NULL) {
            freeTrieNodeRecursive(node->children[i]);
            node->children[i] = NULL;
        }
    }
    free(node);
}

void freeTrie(Trie *trie) {
    if (trie == NULL) {
        return;
    }
    freeTrieNodeRecursive(trie->root);
    trie->root = NULL;
    trie->nodeCount = 0;
    trie->indexedWordCount = 0;
}

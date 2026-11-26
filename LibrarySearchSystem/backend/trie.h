#ifndef TRIE_H
#define TRIE_H

#define ALPHABET_SIZE 27
#define MAX_TRIE_WORD_LEN 8
#define TRIE_SEPARATOR '#'

typedef struct TrieNode {
    struct TrieNode *children[ALPHABET_SIZE];
    int maxId;
} TrieNode;

typedef struct Trie {
    TrieNode *root;
    int nodeCount;
    int indexedWordCount;
} Trie;

int initializeTrie(Trie *trie);
TrieNode *createNode(void);
int characterToIndex(char ch);
int insertSequence(Trie *trie, const char *sequence, int wordId);
int insertWord(Trie *trie, const char *word, int wordId);
int searchWord(const Trie *trie, const char *prefix, const char *suffix);
int searchWordWithSteps(const Trie *trie, const char *prefix, const char *suffix, int *stepsOut);
void freeTrie(Trie *trie);

#endif /* TRIE_H */


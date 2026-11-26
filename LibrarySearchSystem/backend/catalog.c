/* C backend source file */
#include <stdio.h>
#include "catalog.h"

static void catCopyTitle(char *dest, const char *src, int maxChars) {
    int i = 0;
    while (i < maxChars && src[i] != '\0') {
        dest[i] = src[i];
        i++;
    }
    dest[i] = '\0';
}

static int catIsWhitespace(char ch) {
    return (ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r' || ch == '\v' || ch == '\f');
}

void initializeCatalog(struct Catalog *catalog) {
    int i;
    int j;
    if (catalog == NULL) {
        return;
    }
    catalog->count = 0;
    for (i = 0; i < MAX_CATALOG_RECORDS; i++) {
        catalog->records[i].id = -1;
        for (j = 0; j < TITLE_BUFFER_SIZE; j++) {
            catalog->records[i].title[j] = '\0';
        }
    }
}

CatalogStatus validateTitleDetailed(const char *title) {
    int len = 0;
    if (title == NULL) {
        return CATALOG_ERR_NULL;
    }
    if (title[0] == '\0') {
        return CATALOG_ERR_EMPTY;
    }

    while (title[len] != '\0') {
        char ch = title[len];
        if (catIsWhitespace(ch)) {
            return CATALOG_ERR_WHITESPACE;
        }
        if (ch >= 'A' && ch <= 'Z') {
            return CATALOG_ERR_UPPERCASE;
        }
        if (!(ch >= 'a' && ch <= 'z')) {
            return CATALOG_ERR_INVALID_CHAR;
        }
        len++;
        if (len > MAX_TITLE_LENGTH) {
            return CATALOG_ERR_TOO_LONG;
        }
    }
    return CATALOG_OK;
}

int validateTitle(const char *title) {
    return (validateTitleDetailed(title) == CATALOG_OK) ? 1 : 0;
}

const char *getCatalogStatusMessage(CatalogStatus status) {
    switch (status) {
        case CATALOG_OK:
            return "Valid catalog record.";
        case CATALOG_ERR_NULL:
            return "Title pointer is null.";
        case CATALOG_ERR_EMPTY:
            return "Title cannot be empty.";
        case CATALOG_ERR_TOO_LONG:
            return "Title exceeds maximum length of 8 characters.";
        case CATALOG_ERR_UPPERCASE:
            return "Title must be lowercase only (uppercase letters are not allowed).";
        case CATALOG_ERR_WHITESPACE:
            return "Title must be a single word (spaces and whitespace are not allowed).";
        case CATALOG_ERR_INVALID_CHAR:
            return "Title must contain only lowercase English letters (a-z); numbers and special characters are rejected.";
        case CATALOG_ERR_FULL:
            return "Catalog is full (maximum 1,000 records reached).";
        case CATALOG_ERR_INVALID_ID:
            return "Invalid record ID requested.";
        default:
            return "Unknown catalog error.";
    }
}

CatalogStatus addRecordDetailed(struct Catalog *catalog, const char *title, int *outId) {
    CatalogStatus status;
    int assignedId;

    if (outId != NULL) {
        *outId = -1;
    }
    if (catalog == NULL) {
        return CATALOG_ERR_NULL;
    }
    if (catalog->count < 0 || catalog->count >= MAX_CATALOG_RECORDS) {
        return CATALOG_ERR_FULL;
    }

    status = validateTitleDetailed(title);
    if (status != CATALOG_OK) {
        return status;
    }

    assignedId = catalog->count;
    catCopyTitle(catalog->records[assignedId].title, title, MAX_TITLE_LENGTH);
    catalog->records[assignedId].id = assignedId;
    catalog->count++;

    if (outId != NULL) {
        *outId = assignedId;
    }
    return CATALOG_OK;
}

int addRecord(struct Catalog *catalog, const char *title) {
    int id = -1;
    if (addRecordDetailed(catalog, title, &id) == CATALOG_OK) {
        return id;
    }
    return -1;
}

int loadCatalog(struct Catalog *catalog, const char * const *titles, int count) {
    int i;
    if (catalog == NULL) {
        return 0;
    }
    initializeCatalog(catalog);
    if (titles == NULL || count <= 0) {
        return 0;
    }
    for (i = 0; i < count && catalog->count < MAX_CATALOG_RECORDS; i++) {
        (void)addRecord(catalog, titles[i]);
    }
    return catalog->count;
}

void displayCatalog(const struct Catalog *catalog) {
    int i;
    if (catalog == NULL) {
        printf("Catalog is uninitialized.\n");
        return;
    }
    printf("\n--- DIGITAL LIBRARY CATALOG (%d / %d records) ---\n",
           catalog->count, MAX_CATALOG_RECORDS);
    if (catalog->count == 0) {
        printf("  (Catalog is currently empty)\n");
        return;
    }
    printf("  %-8s %-16s %-10s\n", "ID", "Order", "Title");
    printf("  ------------------------------------\n");
    for (i = 0; i < catalog->count; i++) {
        printf("  %-8d #%-15d %-10s\n",
               catalog->records[i].id,
               i + 1,
               catalog->records[i].title);
    }
}

const char *getTitleByID(const struct Catalog *catalog, int id) {
    if (catalog == NULL || id < 0 || id >= catalog->count) {
        return NULL;
    }
    if (catalog->records[id].id != id) {
        return NULL;
    }
    return catalog->records[id].title;
}

int getCatalogCount(const struct Catalog *catalog) {
    if (catalog == NULL) {
        return 0;
    }
    return catalog->count;
}

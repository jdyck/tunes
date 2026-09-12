// Keep this complete list in sync with the top-level tables in convex/schema.ts.
export const APPLICATION_TABLES = [
  "users",
  "songs",
  "songUserData",
  "artists",
  "artistMembershipLookups",
  "artistUserData",
  "songArtistCredits",
  "releaseGroups",
  "recordings",
  "userRecordingData",
  "youtubeItems",
  "recordingYoutubeItems",
  "recordingArtistCredits",
  "recordingPersonnel",
  "recordingArtistAttributions",
  "releaseGroupArtistAttributions",
] as const;

export type ApplicationTable = (typeof APPLICATION_TABLES)[number];

export type SnapshotDocument = {
  _id: string;
  _creationTime: number;
  [field: string]: unknown;
};

export type SnapshotTables = Readonly<
  Partial<Record<ApplicationTable, readonly SnapshotDocument[]>>
>;

export type CompleteSnapshotTables = Record<
  ApplicationTable,
  SnapshotDocument[]
>;

export type FilteredSnapshot = {
  tables: CompleteSnapshotTables;
  productionUserId: string;
  importedUserId: string;
  counts: Record<ApplicationTable, number>;
};

const PRIVATE_USER_TABLES = [
  "songUserData",
  "artistUserData",
  "userRecordingData",
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const tableDocuments = (
  snapshot: SnapshotTables,
  table: ApplicationTable,
): readonly SnapshotDocument[] => snapshot[table] ?? [];

const requiredString = (
  document: SnapshotDocument,
  table: ApplicationTable,
  field: string,
) => {
  const value = document[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid ${table}.${field} reference`);
  }
  return value;
};

const stringOrNull = (
  document: SnapshotDocument,
  table: ApplicationTable,
  field: string,
) => {
  const value = document[field];
  if (value !== null && typeof value !== "string") {
    throw new Error(`Invalid ${table}.${field} reference`);
  }
  return value;
};

const validateDocuments = (
  documents: readonly SnapshotDocument[],
  table: string,
) => {
  const ids = new Set<string>();
  for (const document of documents) {
    if (!isRecord(document)) {
      throw new Error(`Invalid document in ${table}`);
    }
    if (
      typeof document._id !== "string" ||
      document._id.length === 0 ||
      typeof document._creationTime !== "number" ||
      !Number.isFinite(document._creationTime)
    ) {
      throw new Error(`Invalid system fields in ${table}`);
    }
    if (ids.has(document._id)) {
      throw new Error(`Duplicate document ID in ${table}`);
    }
    ids.add(document._id);
  }
};

export const parseDocumentsJsonl = (
  content: string,
  table = "snapshot",
): SnapshotDocument[] => {
  const documents: SnapshotDocument[] = [];
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      throw new Error(`Invalid JSON in ${table} line ${index + 1}`);
    }
    if (!isRecord(value)) {
      throw new Error(`Expected a JSON object in ${table} line ${index + 1}`);
    }
    documents.push(value as SnapshotDocument);
  }
  validateDocuments(documents, table);
  return documents;
};

export const documentsToJsonLines = (
  documents: readonly SnapshotDocument[],
) => (documents.length === 0 ? "" : `${documents.map((document) => JSON.stringify(document)).join("\n")}\n`);

const completeSnapshot = (snapshot: SnapshotTables): CompleteSnapshotTables => {
  const complete = {} as CompleteSnapshotTables;
  for (const table of APPLICATION_TABLES) {
    const documents = [...tableDocuments(snapshot, table)];
    validateDocuments(documents, table);
    complete[table] = documents;
  }
  return complete;
};

const findExactlyOneUser = (
  snapshot: SnapshotTables,
  clerkSubject: string,
  description: string,
) => {
  const matches = tableDocuments(snapshot, "users").filter(
    (document) => document.clerkSubject === clerkSubject,
  );
  if (matches.length === 0) {
    throw new Error(
      `No ${description} User matched clerkSubject ${clerkSubject}; use the exact Clerk User ID from the production users table, not a Convex document ID`,
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `Multiple ${description} Users matched clerkSubject ${clerkSubject}`,
    );
  }
  const [user] = matches;
  if (!user || typeof user._id !== "string") {
    throw new Error(`Invalid ${description} User`);
  }
  return user;
};

const add = (set: Set<string>, value: string) => {
  const size = set.size;
  set.add(value);
  return set.size !== size;
};

const validateReferences = (tables: CompleteSnapshotTables) => {
  const ids = new Map<ApplicationTable, Set<string>>();
  for (const table of APPLICATION_TABLES) {
    ids.set(table, new Set(tables[table].map((document) => document._id)));
  }

  const foreignKeys: ReadonlyArray<readonly [
    ApplicationTable,
    string,
    ApplicationTable,
    boolean?,
  ]> = [
    ["songUserData", "userId", "users"],
    ["songUserData", "songId", "songs"],
    ["artistUserData", "userId", "users"],
    ["artistUserData", "artistId", "artists"],
    ["songArtistCredits", "songId", "songs"],
    ["songArtistCredits", "artistId", "artists"],
    ["artistMembershipLookups", "artistId", "artists"],
    ["recordings", "songId", "songs"],
    ["recordings", "releaseGroupId", "releaseGroups", true],
    ["userRecordingData", "userId", "users"],
    ["userRecordingData", "recordingId", "recordings"],
    ["userRecordingData", "songId", "songs"],
    ["recordingYoutubeItems", "recordingId", "recordings"],
    ["recordingYoutubeItems", "songId", "songs"],
    ["recordingYoutubeItems", "youtubeItemId", "youtubeItems"],
    ["recordingArtistCredits", "recordingId", "recordings"],
    ["recordingArtistCredits", "artistId", "artists"],
    ["recordingPersonnel", "recordingId", "recordings"],
    ["recordingPersonnel", "artistId", "artists"],
    ["recordingArtistAttributions", "recordingId", "recordings"],
    ["recordingArtistAttributions", "artistId", "artists"],
    ["releaseGroupArtistAttributions", "releaseGroupId", "releaseGroups"],
    ["releaseGroupArtistAttributions", "artistId", "artists"],
  ];

  for (const [table, field, target, nullable] of foreignKeys) {
    for (const document of tables[table]) {
      const value = document[field];
      if (nullable && value === null) continue;
      if (typeof value !== "string" || !ids.get(target)?.has(value)) {
        throw new Error(`Missing ${target} reference from ${table}.${field}`);
      }
    }
  }
};

export const filterProductionSnapshot = (
  productionSnapshotInput: SnapshotTables,
  localSnapshotInput: SnapshotTables,
  options: {
    productionClerkSubject: string;
    localClerkSubject: string;
  },
): FilteredSnapshot => {
  const productionSnapshot = completeSnapshot(productionSnapshotInput);
  const localSnapshot = completeSnapshot(localSnapshotInput);
  const productionUser = findExactlyOneUser(
    productionSnapshot,
    options.productionClerkSubject,
    "production",
  );
  const localUser = findExactlyOneUser(
    localSnapshot,
    options.localClerkSubject,
    "hosted development",
  );
  if (localUser.role !== "user") {
    throw new Error("The configured hosted development account is not a User");
  }

  const productionUserId = productionUser._id;
  // All imported IDs must use the production table-number namespace. The local
  // User ID can encode the same table number as a different production table.
  // Copy development identity fields only; never import production identity or role.
  const importedUserId = productionUserId;
  const songIds = new Set<string>();
  const recordingIds = new Set<string>();
  const artistIds = new Set<string>();
  const releaseGroupIds = new Set<string>();
  const youtubeItemIds = new Set<string>();

  const selectedPrivateRows = {} as Record<
    (typeof PRIVATE_USER_TABLES)[number],
    SnapshotDocument[]
  >;
  for (const table of PRIVATE_USER_TABLES) {
    selectedPrivateRows[table] = productionSnapshot[table].filter(
      (document) => document.userId === productionUserId,
    );
  }
  for (const document of selectedPrivateRows.songUserData) {
    add(songIds, requiredString(document, "songUserData", "songId"));
  }
  for (const document of selectedPrivateRows.artistUserData) {
    add(artistIds, requiredString(document, "artistUserData", "artistId"));
  }
  for (const document of selectedPrivateRows.userRecordingData) {
    add(recordingIds, requiredString(document, "userRecordingData", "recordingId"));
    add(songIds, requiredString(document, "userRecordingData", "songId"));
  }

  let changed = true;
  while (changed) {
    changed = false;

    for (const document of productionSnapshot.recordings) {
      const songId = requiredString(document, "recordings", "songId");
      if (songIds.has(songId)) {
        changed = add(recordingIds, document._id) || changed;
      }
    }

    for (const document of productionSnapshot.recordings) {
      if (!recordingIds.has(document._id)) continue;
      changed = add(songIds, requiredString(document, "recordings", "songId")) || changed;
      const releaseGroupId = stringOrNull(document, "recordings", "releaseGroupId");
      if (releaseGroupId !== null) {
        changed = add(releaseGroupIds, releaseGroupId) || changed;
      }
    }

    for (const document of productionSnapshot.songArtistCredits) {
      if (!songIds.has(requiredString(document, "songArtistCredits", "songId"))) continue;
      changed = add(artistIds, requiredString(document, "songArtistCredits", "artistId")) || changed;
    }

    for (const document of productionSnapshot.recordingArtistCredits) {
      if (!recordingIds.has(requiredString(document, "recordingArtistCredits", "recordingId"))) continue;
      changed = add(artistIds, requiredString(document, "recordingArtistCredits", "artistId")) || changed;
    }

    for (const document of productionSnapshot.recordingPersonnel) {
      if (!recordingIds.has(requiredString(document, "recordingPersonnel", "recordingId"))) continue;
      changed = add(artistIds, requiredString(document, "recordingPersonnel", "artistId")) || changed;
    }

    for (const document of productionSnapshot.recordingArtistAttributions) {
      if (!recordingIds.has(requiredString(document, "recordingArtistAttributions", "recordingId"))) continue;
      changed = add(artistIds, requiredString(document, "recordingArtistAttributions", "artistId")) || changed;
    }

    for (const document of productionSnapshot.releaseGroupArtistAttributions) {
      if (!releaseGroupIds.has(requiredString(document, "releaseGroupArtistAttributions", "releaseGroupId"))) continue;
      changed = add(artistIds, requiredString(document, "releaseGroupArtistAttributions", "artistId")) || changed;
    }

    for (const document of productionSnapshot.recordingYoutubeItems) {
      const recordingId = requiredString(document, "recordingYoutubeItems", "recordingId");
      const songId = requiredString(document, "recordingYoutubeItems", "songId");
      if (!recordingIds.has(recordingId) && !songIds.has(songId)) continue;
      changed = add(recordingIds, recordingId) || changed;
      changed = add(songIds, songId) || changed;
      changed = add(
        youtubeItemIds,
        requiredString(document, "recordingYoutubeItems", "youtubeItemId"),
      ) || changed;
    }
  }

  const tables = {} as CompleteSnapshotTables;
  for (const table of APPLICATION_TABLES) {
    switch (table) {
      case "users":
        tables[table] = [{ ...localUser, _id: importedUserId }];
        break;
      case "songUserData":
      case "artistUserData":
      case "userRecordingData":
        tables[table] = selectedPrivateRows[table].map((document) => ({
          ...document,
          userId: importedUserId,
        }));
        break;
      case "songs":
        tables[table] = productionSnapshot[table].filter((document) =>
          songIds.has(document._id),
        );
        break;
      case "recordings":
        tables[table] = productionSnapshot[table].filter((document) =>
          recordingIds.has(document._id),
        );
        break;
      case "artists":
        tables[table] = productionSnapshot[table].filter((document) =>
          artistIds.has(document._id),
        );
        break;
      case "releaseGroups":
        tables[table] = productionSnapshot[table].filter((document) =>
          releaseGroupIds.has(document._id),
        );
        break;
      case "youtubeItems":
        tables[table] = productionSnapshot[table].filter((document) =>
          youtubeItemIds.has(document._id),
        );
        break;
      case "songArtistCredits":
        tables[table] = productionSnapshot[table].filter((document) =>
          songIds.has(requiredString(document, table, "songId")),
        );
        break;
      case "artistMembershipLookups":
        tables[table] = productionSnapshot[table].filter((document) =>
          artistIds.has(requiredString(document, table, "artistId")),
        );
        break;
      case "recordingYoutubeItems":
        tables[table] = productionSnapshot[table].filter((document) =>
          recordingIds.has(requiredString(document, table, "recordingId")),
        );
        break;
      case "recordingArtistCredits":
      case "recordingPersonnel":
      case "recordingArtistAttributions":
        tables[table] = productionSnapshot[table].filter((document) =>
          recordingIds.has(requiredString(document, table, "recordingId")),
        );
        break;
      case "releaseGroupArtistAttributions":
        tables[table] = productionSnapshot[table].filter((document) =>
          releaseGroupIds.has(requiredString(document, table, "releaseGroupId")),
        );
        break;
    }
  }

  validateReferences(tables);
  const counts = {} as Record<ApplicationTable, number>;
  for (const table of APPLICATION_TABLES) counts[table] = tables[table].length;
  return { tables, productionUserId, importedUserId, counts };
};

const bufferToHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

const getFileFingerprint = async (file: File) => {
  const hashBuffer = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return `${file.size}:${file.type}:${bufferToHex(hashBuffer)}`;
};

export interface UniqueListingFilesResult {
  duplicateFiles: File[];
  filesToAdd: File[];
  overflowCount: number;
}

export const getUniqueListingFiles = async ({
  existingFiles,
  incomingFiles,
  maxFiles,
}: {
  existingFiles: File[];
  incomingFiles: File[];
  maxFiles: number;
}): Promise<UniqueListingFilesResult> => {
  const seenFingerprints = new Set(await Promise.all(existingFiles.map(getFileFingerprint)));
  const uniqueFiles: File[] = [];
  const duplicateFiles: File[] = [];

  for (const file of incomingFiles) {
    const fingerprint = await getFileFingerprint(file);

    if (seenFingerprints.has(fingerprint)) {
      duplicateFiles.push(file);
      continue;
    }

    uniqueFiles.push(file);
    seenFingerprints.add(fingerprint);
  }

  const remainingSlots = Math.max(0, maxFiles - existingFiles.length);

  return {
    duplicateFiles,
    filesToAdd: uniqueFiles.slice(0, remainingSlots),
    overflowCount: Math.max(0, uniqueFiles.length - remainingSlots),
  };
};
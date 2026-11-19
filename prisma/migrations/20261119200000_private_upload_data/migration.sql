CREATE TABLE "UploadData" (
    "uploadId" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    CONSTRAINT "UploadData_pkey" PRIMARY KEY ("uploadId"),
    CONSTRAINT "UploadData_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Endpoint" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Endpoint_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Endpoint" ADD CONSTRAINT "Endpoint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

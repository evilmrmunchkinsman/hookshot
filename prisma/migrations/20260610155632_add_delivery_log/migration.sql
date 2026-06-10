-- CreateTable
CREATE TABLE "DeliveryLog" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,

    CONSTRAINT "DeliveryLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DeliveryLog" ADD CONSTRAINT "DeliveryLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

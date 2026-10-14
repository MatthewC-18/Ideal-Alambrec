-- Keep every decimal of PVS values imported from Excel (e.g. 0.87915611814346) so PVS-category totals match it to the cent.
ALTER TABLE "PriceListItem" ALTER COLUMN "pvs" SET DATA TYPE DECIMAL(20,10);

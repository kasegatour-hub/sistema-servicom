export type ShipmentClientDirectoryInput = {
  senderName?: string | null;
  senderLastName?: string | null;
  senderDni?: string | null;
  senderPhone?: string | null;
  senderEmail?: string | null;
  recipientName?: string | null;
  recipientLastName?: string | null;
  recipientDni?: string | null;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
};

export type ClientDirectoryRecord = {
  name: string;
  lastName: string;
  dni: string | null;
  phone: string | null;
  email: string | null;
};

function clean(value?: string | null) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

export function buildShipmentClientDirectoryRecords(input: ShipmentClientDirectoryInput): ClientDirectoryRecord[] {
  const sender = {
    name: clean(input.senderName),
    lastName: clean(input.senderLastName),
    dni: clean(input.senderDni),
    phone: clean(input.senderPhone),
    email: clean(input.senderEmail),
  };
  const recipient = {
    name: clean(input.recipientName),
    lastName: clean(input.recipientLastName),
    dni: clean(input.recipientDni),
    phone: clean(input.recipientPhone),
    email: clean(input.recipientEmail),
  };

  return [sender, recipient].filter(
    (record): record is ClientDirectoryRecord => Boolean(record.name && record.lastName),
  );
}

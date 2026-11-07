# Server API the app expects

The app uploads to the base URL in `EXPO_PUBLIC_API_URL`, which must be `https://`. Nothing is sent without the patient's consent and a participant code.

## `POST /v1/sync`

```
Authorization: Bearer <participant code>
Content-Type: application/json
```

```json
{
  "schema": 1,
  "records": [
    { "kind": "dose", "id": "med-1:2026-11-07:09:00", "updatedAt": 1794000000000, "data": {} }
  ]
}
```

| `kind` | `id` | `data` type in `src/lib/types.ts` |
| --- | --- | --- |
| `med` | medication ID | `Med` |
| `dose` | `medId:date:time` | `DoseLog` (`deleted: true` means the patient undid the dose) |
| `checkin` | date | `CheckIn` |
| `bp` | entry ID | `BpEntry` |
| `metrics` | date | `DayMetrics` |

- **Upsert by `(participant, kind, id)`.** Keep the record with the highest `updatedAt`. A retry can resend the same records, so this must be safe to repeat.
- **Respond with any 2xx** once records are stored. On any other status the app keeps them and sends them again later.
- **Reject invalid codes with 401.** Codes act as credentials, so make them long and random, and store only a hash.

The patient's name, emergency contact, doctor and allergies are not uploaded. The participant code is how the server links records to a person, so keep that mapping separately and restrict access to it.

## Not covered yet

Downloading data to a new phone isn't supported, so this is one-way backup. Family alerts and a coordinator panel would need further endpoints.

# Export & Import Multiple Custom Setting Records Using LWC

A Salesforce Lightning Web Component (LWC) solution for bulk exporting and importing Custom Setting records via CSV files — no data loader or third-party tools required.

## Features

### Export
- Select up to **30 Custom Settings** at once for export
- Each setting is exported as a separate `.csv` file
- Optional toggle to include system/read-only fields in the export

### Import
- Upload up to **10 CSV files** per batch
- Validates that each filename matches the Custom Setting API name
- Processes records with partial-success support (failed rows do not block the rest)
- Automatically generates an **error report CSV** for any rows that failed to import

## Component Structure

```
force-app/
├── classes/
│   ├── ImportAndExportCustomSettingController.cls
│   └── ImportAndExportCustomSettingController.cls-meta.xml
└── lwc/
    ├── importAndExportCustomSetting/
    │   ├── importAndExportCustomSetting.html
    │   ├── importAndExportCustomSetting.js
    │   ├── importAndExportCustomSetting.js-meta.xml
    │   └── __tests__/
    └── utils/
```

## How It Works

### Apex Controller (`ImportAndExportCustomSettingController`)

| Method | Description |
|---|---|
| `getAllCustomSettings()` | Queries `EntityDefinition` to list all Custom Settings in the org |
| `getCustomSettingHeaders()` | Returns field API names and labels; filters out non-updateable fields unless "Export system fields" is enabled |
| `getCustomSettingData()` | Dynamically queries all fields for a given Custom Setting object |
| `loadData()` | Parses an uploaded CSV (`ContentVersion`), maps columns to fields, type-converts values, and inserts records via `Database.insert` with `allOrNothing=false` |

Supported field types for import: `String`, `Date`, `DateTime`, `Double`, `Boolean`, `Integer`.

### LWC Component (`importAndExportCustomSetting`)

The component renders a card with two modes toggled by radio buttons:

**Export mode**
1. A dual-listbox lists all available Custom Settings.
2. User selects settings and optionally checks "Export system fields as well".
3. Clicking **Export** downloads one CSV per selected setting, staggered 1 second apart.

**Import mode**
1. A dual-listbox lists the Custom Settings to import into.
2. User uploads one or more `.csv` files (filename must match the Custom Setting API name).
3. Clicking **Import** uploads each file to Salesforce Files, calls the Apex controller, and shows a success/failure count.
4. If any rows fail, an error CSV is automatically downloaded.

## Constraints

| Limit | Value |
|---|---|
| Max exports per operation | 30 |
| Max imports per operation | 10 |
| Max records per import file | 5,000 |
| Accepted file format | `.csv` / `.CSV` |
| Import filename | Must exactly match the Custom Setting API name |

## Deployment

Deploy with Salesforce CLI:

```bash
sf project deploy start --source-dir force-app
```

Or with the legacy SFDX CLI:

```bash
sfdx force:source:deploy -p force-app
```

After deployment, add the `importAndExportCustomSetting` LWC to any **App Page**, **Record Page**, or **Home Page** via Lightning App Builder.

## Requirements

- Salesforce org with at least one Hierarchy or List Custom Setting
- User must have **Customize Application** or appropriate Custom Setting CRUD permissions
- API version 50.0+

## Usage

1. Open the page where the component is placed.
2. Choose **Export** or **Import** mode using the toggle.
3. **To export:** select one or more Custom Settings → click **Export** → CSV files download automatically.
4. **To import:** select the target Custom Setting(s) → upload matching CSV files → click **Import** → review the success summary and any error CSV.

## License

This project is open-source.

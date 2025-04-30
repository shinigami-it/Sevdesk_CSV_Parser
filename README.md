# 💸 SevDesk CSV Parser

This Node.js project processes and transforms financial transaction exports from **Wise** and **Hetzner** into a unified CSV format ready for import into **SevDesk**.

---

## 📦 Clone & Setup

```bash
git clone https://github.com/shinigami-it/Sevdesk_CSV_Parser.git
cd Sevdesk_CSV_Parser
npm install
```

---

## 🚀 Usage

1. Place your **Wise** export CSVs in the `wise/` folder.
2. Place your **Hetzner** export CSVs in the `hetzner/` folder.
3. Run the parser:

```bash
node main.js
```

4. The output will be written to the `sevdesk/` folder.

---

## 📁 Folder Structure

```
.
├── wise/         # Wise CSV exports
├── hetzner/      # Hetzner CSV exports
├── sevdesk/      # Output folder (auto-created)
├── main.js       # Main processing script
├── package.json
```

---

## 🧠 Features

- Converts Wise and Hetzner exports into SevDesk-importable format
- Merges transactions by day or by month
- Automatically splits credits and debits
- Converts dates and numbers to SevDesk-compatible formatting

---

## ✅ SevDesk Import Settings

When importing the resulting CSVs into **SevDesk**, apply the following options under **Import options**:

- ✔️ **First line is column name**
- ✔️ **Credit / debit columns**

### Format Settings:
- **Number format:** `1,000.00`  
- **Encoding:** `Unicode (UTF-8)`  
- **Date format:** `YYYY-MM-DD`  
- **Date region:** `EN`  
- **Delimiter:** `automatic`
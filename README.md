# Incrementum Dashboard

Simple locally runnable portfolio dashboard built with plain HTML, CSS, and JavaScript.

## Current scope

- Tab-based interface: Dashboard, Holdings, Transactions
- Manual transaction entry
- Supported transaction types: BUY, SELL, DEPOSIT, WITHDRAWAL
- Holdings calculated only from BUY and SELL
- Average cost method for holdings
- Manual current prices
- Net invested capital calculated from deposits minus withdrawals
- Cash kept as a manual editable field
- CSV-first Interactive Brokers import
- PDF upload accepted with a clear limitation message

## How to run

Open `index.html` in your browser.

## Import notes

- CSV is the preferred IBKR import format in this version
- The importer looks for common columns such as date, type, symbol, quantity, price, amount, currency, and notes
- PDF parsing is not implemented yet in this pure frontend version

## Storage

Data is stored in browser `localStorage` on the same machine and browser profile.

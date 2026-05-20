"""skstock - simple command-line stock portfolio tracker."""

import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path


PORTFOLIO_FILE = Path.home() / ".skstock" / "portfolio.json"
CURRENCY = "USD"


# ---------------------------------------------------------------------------
# Portfolio persistence
# ---------------------------------------------------------------------------

def load_portfolio() -> dict:
    if not PORTFOLIO_FILE.exists():
        return {}
    with PORTFOLIO_FILE.open() as f:
        return json.load(f)


def save_portfolio(portfolio: dict) -> None:
    PORTFOLIO_FILE.parent.mkdir(parents=True, exist_ok=True)
    with PORTFOLIO_FILE.open("w") as f:
        json.dump(portfolio, f, indent=2)


# ---------------------------------------------------------------------------
# Price fetching (Yahoo Finance unofficial quote endpoint)
# ---------------------------------------------------------------------------

def fetch_price(symbol: str) -> float | None:
    """Return current price for *symbol*, or None on failure."""
    url = (
        "https://query1.finance.yahoo.com/v8/finance/chart/"
        f"{symbol.upper()}?interval=1d&range=1d"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "skstock/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
        meta = data["chart"]["result"][0]["meta"]
        return float(meta["regularMarketPrice"])
    except (urllib.error.URLError, KeyError, TypeError, json.JSONDecodeError):
        return None


# ---------------------------------------------------------------------------
# Portfolio value calculation
# ---------------------------------------------------------------------------

def portfolio_value(portfolio: dict) -> dict:
    """Return per-symbol and total market value for the portfolio.

    Each entry in *portfolio* maps symbol -> {"shares": float, "cost_basis": float}.
    Returns a dict with keys: "positions" (list of position dicts) and "total_value".
    """
    positions = []
    total_value = 0.0
    total_cost = 0.0

    for symbol, holding in portfolio.items():
        shares = holding.get("shares", 0)
        cost_basis = holding.get("cost_basis", 0.0)
        price = fetch_price(symbol)

        if price is None:
            market_value = None
            gain_loss = None
            pct_change = None
        else:
            market_value = price * shares
            gain_loss = market_value - cost_basis
            pct_change = (gain_loss / cost_basis * 100) if cost_basis else 0.0
            total_value += market_value
            total_cost += cost_basis

        positions.append({
            "symbol": symbol,
            "shares": shares,
            "price": price,
            "market_value": market_value,
            "cost_basis": cost_basis,
            "gain_loss": gain_loss,
            "pct_change": pct_change,
        })

    total_gain_loss = total_value - total_cost
    total_pct = (total_gain_loss / total_cost * 100) if total_cost else 0.0

    return {
        "positions": positions,
        "total_value": total_value,
        "total_cost": total_cost,
        "total_gain_loss": total_gain_loss,
        "total_pct": total_pct,
        "as_of": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
    }


# ---------------------------------------------------------------------------
# CLI commands
# ---------------------------------------------------------------------------

def cmd_add(args: list[str]) -> None:
    """add <SYMBOL> <shares> [cost_basis]"""
    if len(args) < 2:
        print("Usage: skstock add <SYMBOL> <shares> [cost_basis]")
        sys.exit(1)
    symbol = args[0].upper()
    shares = float(args[1])
    cost_basis = float(args[2]) if len(args) >= 3 else 0.0

    portfolio = load_portfolio()
    existing = portfolio.get(symbol, {"shares": 0, "cost_basis": 0.0})
    portfolio[symbol] = {
        "shares": existing["shares"] + shares,
        "cost_basis": existing["cost_basis"] + cost_basis,
    }
    save_portfolio(portfolio)
    print(f"Added {shares} shares of {symbol} (cost basis: {cost_basis:.2f} {CURRENCY})")


def cmd_remove(args: list[str]) -> None:
    """remove <SYMBOL>"""
    if not args:
        print("Usage: skstock remove <SYMBOL>")
        sys.exit(1)
    symbol = args[0].upper()
    portfolio = load_portfolio()
    if symbol not in portfolio:
        print(f"{symbol} not in portfolio.")
        sys.exit(1)
    del portfolio[symbol]
    save_portfolio(portfolio)
    print(f"Removed {symbol} from portfolio.")


def cmd_price(args: list[str]) -> None:
    """price <SYMBOL> [SYMBOL ...]"""
    if not args:
        print("Usage: skstock price <SYMBOL> [SYMBOL ...]")
        sys.exit(1)
    for symbol in args:
        price = fetch_price(symbol.upper())
        if price is None:
            print(f"{symbol.upper():<8}  (unavailable)")
        else:
            print(f"{symbol.upper():<8}  {price:>10.2f} {CURRENCY}")


def cmd_portfolio(_args: list[str]) -> None:
    """Show portfolio summary with market values and gains/losses."""
    portfolio = load_portfolio()
    if not portfolio:
        print("Portfolio is empty. Use 'skstock add <SYMBOL> <shares> [cost_basis]'.")
        return

    result = portfolio_value(portfolio)

    # Header
    print(f"\n{'SYMBOL':<8} {'SHARES':>8} {'PRICE':>10} {'MKT VALUE':>12} {'COST BASIS':>12} {'GAIN/LOSS':>12} {'%':>8}")
    print("-" * 74)

    for pos in result["positions"]:
        price_str = f"{pos['price']:.2f}" if pos["price"] is not None else "N/A"
        mv_str = f"{pos['market_value']:.2f}" if pos["market_value"] is not None else "N/A"
        gl_str = f"{pos['gain_loss']:+.2f}" if pos["gain_loss"] is not None else "N/A"
        pct_str = f"{pos['pct_change']:+.1f}%" if pos["pct_change"] is not None else "N/A"
        print(
            f"{pos['symbol']:<8} {pos['shares']:>8.2f} {price_str:>10} "
            f"{mv_str:>12} {pos['cost_basis']:>12.2f} {gl_str:>12} {pct_str:>8}"
        )

    print("-" * 74)
    print(
        f"{'TOTAL':<8} {'':>8} {'':>10} "
        f"{result['total_value']:>12.2f} {result['total_cost']:>12.2f} "
        f"{result['total_gain_loss']:>+12.2f} {result['total_pct']:>+7.1f}%"
    )
    print(f"\nAs of {result['as_of']}")


def cmd_list(_args: list[str]) -> None:
    """List symbols and share counts in portfolio."""
    portfolio = load_portfolio()
    if not portfolio:
        print("Portfolio is empty.")
        return
    for symbol, holding in sorted(portfolio.items()):
        print(f"{symbol:<8}  {holding['shares']:.4f} shares")


def cmd_export(args: list[str]) -> None:
    """export [--format csv|json] [--output FILE]

    Export the portfolio (with live prices) to CSV or JSON.
    Defaults to CSV written to stdout.
    """
    import csv
    import io

    fmt = "csv"
    output_path = None

    i = 0
    while i < len(args):
        if args[i] in ("--format", "-f") and i + 1 < len(args):
            fmt = args[i + 1].lower()
            i += 2
        elif args[i] in ("--output", "-o") and i + 1 < len(args):
            output_path = args[i + 1]
            i += 2
        else:
            print(f"Unknown option: {args[i]}")
            print("Usage: skstock export [--format csv|json] [--output FILE]")
            sys.exit(1)

    if fmt not in ("csv", "json"):
        print(f"Unsupported format '{fmt}'. Choose 'csv' or 'json'.")
        sys.exit(1)

    portfolio = load_portfolio()
    if not portfolio:
        print("Portfolio is empty.")
        return

    result = portfolio_value(portfolio)

    if fmt == "json":
        text = json.dumps(result, indent=2)
    else:
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["symbol", "shares", "price", "market_value", "cost_basis", "gain_loss", "pct_change"])
        for pos in result["positions"]:
            writer.writerow([
                pos["symbol"],
                pos["shares"],
                pos["price"] if pos["price"] is not None else "",
                pos["market_value"] if pos["market_value"] is not None else "",
                pos["cost_basis"],
                pos["gain_loss"] if pos["gain_loss"] is not None else "",
                pos["pct_change"] if pos["pct_change"] is not None else "",
            ])
        text = buf.getvalue()

    if output_path:
        Path(output_path).write_text(text)
        print(f"Exported {len(result['positions'])} position(s) to {output_path} ({fmt.upper()})")
    else:
        print(text, end="")


# TODO: Add price-alert support so users can set high/low thresholds per
# symbol and be notified (via stdout or desktop notification) when the price
# crosses the threshold during a `skstock watch` session.

# TODO: Cache fetched prices to disk with a configurable TTL so rapid
# re-runs don't hammer the upstream API unnecessarily.


COMMANDS = {
    "add": cmd_add,
    "remove": cmd_remove,
    "price": cmd_price,
    "portfolio": cmd_portfolio,
    "list": cmd_list,
    "export": cmd_export,
}

HELP = """skstock - command-line stock portfolio tracker

Commands:
  add <SYMBOL> <shares> [cost_basis]   Add shares to portfolio
  remove <SYMBOL>                       Remove symbol from portfolio
  price <SYMBOL> [SYMBOL ...]           Fetch live price(s)
  portfolio                             Show portfolio with market values
  list                                  List portfolio symbols
  export [--format csv|json] [-o FILE]  Export portfolio to CSV or JSON
"""


def main() -> None:
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help", "help"):
        print(HELP)
        return
    cmd = args[0]
    if cmd not in COMMANDS:
        print(f"Unknown command: {cmd}\n")
        print(HELP)
        sys.exit(1)
    COMMANDS[cmd](args[1:])


if __name__ == "__main__":
    main()

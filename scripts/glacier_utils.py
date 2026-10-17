"""Shared paths, size classes and plotting style for the Nepal glacier project."""
from pathlib import Path
import numpy as np
import matplotlib as mpl
import matplotlib.pyplot as plt

# ---- paths ----
_cwd = Path.cwd()
ROOT = _cwd.parent if _cwd.name == "notebooks" else _cwd
PROC = ROOT / "data" / "processed"
FIG = ROOT / "outputs" / "figures"
TAB = ROOT / "outputs" / "tables"
for _d in (FIG, TAB):
    _d.mkdir(parents=True, exist_ok=True)

# Custom Albers equal-area CRS centred on Nepal (all area calculations)
AEA = "+proj=aea +lat_1=27 +lat_2=30 +lat_0=28.5 +lon_0=84 +datum=WGS84 +units=m +no_defs"

# ---- glacier size classes (km2) ----
SIZE_BINS = [0, 0.5, 1, 5, 10, 50, np.inf]
SIZE_LABELS = ["<0.5", "0.5–1", "1–5", "5–10", "10–50", ">50"]
# Viridis is perceptually uniform and colourblind-safe; light-to-dark = small-to-large
SIZE_COLORS = [mpl.colors.to_hex(c) for c in plt.cm.viridis(np.linspace(0.92, 0.05, 6))]


def add_size_class(df, col="area_km2"):
    """Add an ordered categorical 'size_class' column (left-closed bins: 0.5 goes in '0.5–1')."""
    import pandas as pd
    out = df.copy()
    out["size_class"] = pd.cut(out[col], bins=SIZE_BINS, labels=SIZE_LABELS, right=False)
    return out


def set_style():
    mpl.rcParams.update({
        "font.family": "DejaVu Sans", "font.size": 10,
        "axes.titlesize": 11, "axes.labelsize": 10,
        "xtick.labelsize": 9, "ytick.labelsize": 9, "legend.fontsize": 9,
        "axes.spines.top": False, "axes.spines.right": False,
        "figure.dpi": 110, "savefig.dpi": 300, "savefig.bbox": "tight",
    })


def save_fig(fig, name):
    """Save PNG (300 dpi) and SVG into outputs/figures/."""
    fig.savefig(FIG / f"{name}.png", dpi=300)
    fig.savefig(FIG / f"{name}.svg")
    print(f"Saved outputs/figures/{name}.png and .svg")
from fontTools.subset import main as subset_main
import sys
import os

# Ensure we are running from repo root or adjust paths
# Assuming script is run from repo root
input_font = "fonts/fredoka-one-latin-400-normal.woff2"
output_font = "fonts/fredoka-subset.woff2"

# Characters to keep (title text: "pictoco")
text = "pictoco"

# Check if input exists
if not os.path.exists(input_font):
    print(f"Error: Input font {input_font} not found.")
    sys.exit(1)

# Construct arguments for pyftsubset
# We use --flavor=woff2 to ensure output is woff2
# We use --with-zopfli (if available) or standard compression
# We want to clear hinting and other non-essential tables to save space since it's a specific title font
args = [
    input_font,
    f"--text={text}",
    "--flavor=woff2",
    f"--output-file={output_font}",
    "--layout-features=*", # Keep common features if needed, or set to empty to strip
    "--no-hinting",       # Usually safe for web fonts, especially display ones
    "--desubroutinize",   # Often helps with subsetting CFF, though this is likely TrueType
    "--verbose"
]

print(f"Subsetting {input_font} to {output_font} with text '{text}'...")
subset_main(args)
print("Subsetting complete.")

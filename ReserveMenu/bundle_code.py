import os

# --- CONFIGURATION ---
# Output file name
OUTPUT_FILE = "all_react_code.txt"

# File extensions to grab (Add more if needed)
EXTENSIONS = {".js", ".jsx", ".ts", ".tsx", ".css", ".html", ".json"}

# Folders to IGNORE (Crucial to avoid node_modules junk)
IGNORE_DIRS = {"node_modules", ".git", ".next", "build", "dist", "coverage"}
# ---------------------

def merge_files():
    # Get the folder where this script is located
    source_dir = os.path.dirname(os.path.abspath(__file__))

    with open(OUTPUT_FILE, "w", encoding="utf-8") as outfile:
        # Walk through all directories
        for root, dirs, files in os.walk(source_dir):
            # Modify dirs in-place to skip ignored folders
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

            for file in files:
                if any(file.endswith(ext) for ext in EXTENSIONS):
                    file_path = os.path.join(root, file)

                    # Create a relative path for cleaner reading
                    relative_path = os.path.relpath(file_path, source_dir)

                    # Skip the output file itself and this script
                    if file == OUTPUT_FILE or file == os.path.basename(__file__):
                        continue

                    # Write file header
                    outfile.write(f"\n{'='*50}\n")
                    outfile.write(f"FILE: {relative_path}\n")
                    outfile.write(f"{'='*50}\n")

                    # Write file content
                    try:
                        with open(file_path, "r", encoding="utf-8") as infile:
                            outfile.write(infile.read())
                            outfile.write("\n")
                    except Exception as e:
                        outfile.write(f"[Error reading file: {e}]\n")

    print(f"✅ Success! Check the file: {OUTPUT_FILE}")

if __name__ == "__main__":
    merge_files()
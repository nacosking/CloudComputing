import os

# Configuration: What to include and what to ignore
included_extensions = ('.tf', '.ts', '.js', '.tsx', '.jsx', '.json', '.html', '.css')
ignored_folders = {'node_modules', 'dist', 'build', '.git', '.terraform', '.next'}

output_file = "full_project_code.txt"

def summarize_project():
    with open(output_file, 'w', encoding='utf-8') as outfile:
        # Walk through the current directory and all subdirectories (including ReserveMenu)
        for root, dirs, files in os.walk('.'):
            # Modify dirs in-place to skip ignored folders
            dirs[:] = [d for d in dirs if d not in ignored_folders]

            for file in files:
                if file.endswith(included_extensions):
                    file_path = os.path.join(root, file)

                    try:
                        with open(file_path, 'r', encoding='utf-8') as infile:
                            outfile.write(f"\n{'='*20}\n")
                            outfile.write(f"FILE: {file_path}\n")
                            outfile.write(f"{'='*20}\n\n")
                            outfile.write(infile.read())
                            outfile.write("\n")
                    except Exception as e:
                        outfile.write(f"Could not read {file_path}: {e}\n")

    print(f"Successfully created {output_file}")

if __name__ == "__main__":
    summarize_project()
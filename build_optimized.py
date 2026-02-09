import os
import zipfile

def create_optimized_zip(source_dir, output_filename):
    # Essential files and folders for the extension
    ALLOWED_FILES = {
        'manifest.json',
        'content.js',
        'popup.js',
        'popup.html',
        'LICENSE'
    }
    ALLOWED_FOLDERS = {
        'icons',
        'fonts'
    }
    # Files to explicitly exclude within allowed folders
    EXCLUDE_EXTENSIONS = {'.ttf', '.py', '.md', '.png_backup'} 

    with zipfile.ZipFile(output_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            rel_root = os.path.relpath(root, source_dir)
            
            # Skip non-essential top-level folders
            if rel_root == '.':
                # Filter files in the root
                files_to_add = [f for f in files if f in ALLOWED_FILES]
                # Filter directories in the root
                dirs[:] = [d for d in dirs if d in ALLOWED_FOLDERS]
            else:
                # We are inside an allowed folder (icons/ or fonts/)
                files_to_add = [f for f in files if not any(f.endswith(ext) for ext in EXCLUDE_EXTENSIONS)]

            for file in files_to_add:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_dir).replace(os.path.sep, '/')
                
                print(f"Adding {arcname}")
                zipf.write(file_path, arcname)

if __name__ == "__main__":
    # Chrome Version
    chrome_dir = r"c:\Users\yaazi\.gemini\antigravity\scratch\urdu-nastaleeq-extension"
    chrome_zip = "urdu-nastaleeq-chrome-optimized.zip"
    print(f"Creating {chrome_zip}...")
    create_optimized_zip(chrome_dir, chrome_zip)
    
    # Firefox Version
    firefox_dir = r"c:\Users\yaazi\.gemini\antigravity\scratch\urdu-nastaleeq-firefox"
    firefox_zip = "urdu-nastaleeq-firefox-optimized.zip"
    print(f"\nCreating {firefox_zip}...")
    create_optimized_zip(firefox_dir, firefox_zip)
    
    print("\nOptimization Complete!")
    print(f"Chrome size: {os.path.getsize(chrome_zip)/1024/1024:.2f} MB")
    print(f"Firefox size: {os.path.getsize(firefox_zip)/1024/1024:.2f} MB")

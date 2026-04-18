import os
import re

directories = ['app', 'components']
changed_files = 0
total_replacements = 0

for d in directories:
    for root, _, files in os.walk(d):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original = content
                
                # We want to replace currency $ with €
                # Cases:
                # >$
                content = re.sub(r'>\$', '>€', content)
                # > $
                content = re.sub(r'> \$', '> €', content)
                # "$"
                content = re.sub(r'"\$"', '"€"', content)
                # '$'
                content = re.sub(r"'\$'", "'€'", content)
                # {"$"}
                content = re.sub(r'\{"\$"\}', '{"€"}', content)
                # {'$'}
                content = re.sub(r"\{'\$'\}", "{'€'}", content)
                
                if original != content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(content)
                    changed_files += 1
                    total_replacements += original.count('>$') + original.count('> $') + original.count('"$"') + original.count("'$'")

print(f"Changed {changed_files} files.")

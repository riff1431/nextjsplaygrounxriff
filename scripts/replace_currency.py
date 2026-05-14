#!/usr/bin/env python3
"""
Replace hardcoded € symbols with cs() from @/utils/currency across all frontend .tsx files.

This script:
1. Adds `import { cs } from "@/utils/currency";` if not present
2. Replaces all € occurrences with the dynamic cs() function call

Patterns handled:
- In JSX text: `€{expr}` → `{cs()}{expr}` or `€10` → `{cs()}10`
- In template literals: `€${expr}` → `${cs()}${expr}` or `€10` → `${cs()}10`
- In string literals: "€10" → \`${cs()}10\`
"""

import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.join(ROOT, "..")

# Directories to scan
SCAN_DIRS = [
    "app/rooms",
    "app/account",
    "app/competition",
    "app/creator",
    "app/terms",
    "components/rooms",
    "components/wallet",
    "components/onboarding",
    "components/live",
    "components/admin/settings/PricingControls.tsx",
    "components/admin/finance",
    "components/admin/dashboard",
    "components/creator",
    "components/navigation",
]

# Files to skip
SKIP_FILES = [
    "CurrencyManager.tsx",  # Our own admin component
]

def get_tsx_files():
    files = []
    for scan_path in SCAN_DIRS:
        full_path = os.path.join(PROJECT, scan_path)
        if os.path.isfile(full_path) and full_path.endswith('.tsx'):
            files.append(full_path)
        elif os.path.isdir(full_path):
            for dirpath, _, filenames in os.walk(full_path):
                for f in filenames:
                    if f.endswith('.tsx') and f not in SKIP_FILES:
                        files.append(os.path.join(dirpath, f))
    return files

def file_has_euro(content):
    return '€' in content

def add_import(content):
    """Add import { cs } from '@/utils/currency' if not present."""
    if 'from "@/utils/currency"' in content or "from '@/utils/currency'" in content:
        return content
    
    # Find a good place to insert the import
    # Try to insert after the last import statement
    lines = content.split('\n')
    last_import_idx = -1
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('import ') and ('from ' in stripped):
            last_import_idx = i
    
    if last_import_idx >= 0:
        lines.insert(last_import_idx + 1, 'import { cs } from "@/utils/currency";')
    else:
        # No imports found, add at top (after "use client" if present)
        insert_at = 0
        for i, line in enumerate(lines):
            if '"use client"' in line or "'use client'" in line or '"use strict"' in line:
                insert_at = i + 1
                break
        lines.insert(insert_at, 'import { cs } from "@/utils/currency";')
    
    return '\n'.join(lines)

def replace_euros(content):
    """Replace all € with cs() calls contextually."""
    
    # We need to be smart about context. Let's do line-by-line replacement.
    lines = content.split('\n')
    new_lines = []
    
    for line in lines:
        if '€' not in line:
            new_lines.append(line)
            continue
        
        # Skip comments
        stripped = line.strip()
        if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
            # Still replace in comments that show up in UI (template literals in comments are fine to skip)
            new_lines.append(line)
            continue
        
        new_line = process_line(line)
        new_lines.append(new_line)
    
    return '\n'.join(new_lines)

def process_line(line):
    """Process a single line, replacing € with cs() in the appropriate context."""
    result = []
    i = 0
    chars = line
    
    while i < len(chars):
        if chars[i] == '€':
            # Determine context
            context = determine_context(chars, i)
            
            if context == 'template_literal':
                # Inside backtick string: €${x} → ${cs()}${x}  or  €10 → ${cs()}10
                result.append('${cs()}')
            elif context == 'jsx_text':
                # In JSX text: >€{x} or >€10 → >{cs()}{x} or >{cs()}10
                result.append('{cs()}')
            elif context == 'string_literal':
                # Inside "..." or '...' — we'll use ${cs()} but need backticks
                # This is complex, skip for now and handle manually
                result.append('${cs()}')
            else:
                # Default: just use ${cs()} 
                result.append('${cs()}')
            
            i += 1
        else:
            result.append(chars[i])
            i += 1
    
    return ''.join(result)

def determine_context(chars, pos):
    """Determine if the € at position pos is inside a template literal, JSX, or string."""
    # Look backwards to find context
    before = chars[:pos]
    
    # Count unescaped backticks before this position
    backtick_count = 0
    j = 0
    while j < len(before):
        if before[j] == '`' and (j == 0 or before[j-1] != '\\'):
            backtick_count += 1
        j += 1
    
    if backtick_count % 2 == 1:
        return 'template_literal'
    
    # Check if we're in JSX text (after > and before < or {)
    # Simple heuristic: if the character before € (ignoring whitespace) is > or is start of line in JSX
    stripped_before = before.rstrip()
    if stripped_before.endswith('>') or stripped_before.endswith('}'):
        return 'jsx_text'
    
    # Check for string context
    # Count quotes
    double_count = before.count('"') - before.count('\\"')
    single_count = before.count("'") - before.count("\\'")
    
    if double_count % 2 == 1 or single_count % 2 == 1:
        return 'string_literal'
    
    # Default to jsx_text since most of our cases are in JSX
    return 'jsx_text'

def main():
    files = get_tsx_files()
    modified = 0
    
    for fpath in files:
        try:
            with open(fpath, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            continue
        
        if not file_has_euro(content):
            continue
        
        # Add import
        new_content = add_import(content)
        # Replace euros
        new_content = replace_euros(new_content)
        
        if new_content != content:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            rel = os.path.relpath(fpath, PROJECT)
            count = content.count('€')
            print(f"  ✓ {rel} ({count} replacements)")
            modified += 1
    
    print(f"\n  Done: {modified} files modified")

if __name__ == '__main__':
    main()

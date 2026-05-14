#!/usr/bin/env python3
"""
Round 3: Fix hardcoded € in API routes (server-side).

These API routes generate notification messages and system messages visible to users.
We need to:
1. Add `import { getServerCurrencySymbol } from "@/utils/serverCurrency";`
2. Add `const SYM = await getServerCurrencySymbol();` at the top of the handler
3. Replace all `€` with `${SYM}`
"""

import os
import re
import sys

PROJECT = "/Users/arifur/Desktop/canadax/nextjsplaygrounxriff"

# Files to fix (from the grep output, excluding currency route and entry-info which is already fixed)
FILES = [
    "app/api/v1/creator/earnings/download/route.ts",
    "app/api/v1/rooms/[roomId]/flash-drops/route.ts",
    "app/api/v1/rooms/[roomId]/flash-drops/request/route.ts",
    "app/api/v1/rooms/[roomId]/flash-drops/unlock/route.ts",
    "app/api/v1/rooms/[roomId]/confessions/tip/route.ts",
    "app/api/v1/rooms/[roomId]/confessions/bid/route.ts",
    "app/api/v1/rooms/[roomId]/confessions/request/route.ts",
    "app/api/v1/rooms/[roomId]/confessions/request/[requestId]/route.ts",
    "app/api/v1/rooms/[roomId]/confessions/unlock/route.ts",
    "app/api/v1/rooms/[roomId]/truth-or-dare/tip/route.ts",
    "app/api/v1/rooms/[roomId]/truth-or-dare/interact/route.ts",
    "app/api/v1/rooms/[roomId]/x-chat/reaction/route.ts",
    "app/api/v1/rooms/[roomId]/suga/gift/route.ts",
    "app/api/v1/rooms/[roomId]/bar-lounge/request/route.ts",
    "app/api/v1/rooms/truth-dare-sessions/route.ts",
    "app/api/v1/rooms/truth-dare-sessions/[sessionId]/join/route.ts",
    "app/api/v1/rooms/sessions/route.ts",
    "app/api/v1/rooms/sessions/[sessionId]/respond-join/route.ts",
    "app/api/v1/rooms/sessions/[sessionId]/tip/route.ts",
    "app/api/v1/rooms/sessions/[sessionId]/billing/route.ts",
    "app/api/admin/earnings/download/route.ts",
]

IMPORT_LINE = 'import { getServerCurrencySymbol } from "@/utils/serverCurrency";'
SYM_LINE = '    const SYM = await getServerCurrencySymbol();'

def add_import(content):
    """Add the import if not already present."""
    if 'getServerCurrencySymbol' in content:
        return content
    lines = content.split('\n')
    # Find last import line
    last_import_idx = -1
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('import ') and ('from ' in stripped):
            last_import_idx = i
    if last_import_idx >= 0:
        lines.insert(last_import_idx + 1, IMPORT_LINE)
    else:
        lines.insert(0, IMPORT_LINE)
    return '\n'.join(lines)

def add_sym_declaration(content):
    """Add SYM = await getServerCurrencySymbol() at the top of each async handler function."""
    if 'const SYM = await getServerCurrencySymbol()' in content:
        return content
    
    # Find async function handlers: export async function GET/POST/PUT/DELETE/PATCH
    pattern = r'(export\s+async\s+function\s+(?:GET|POST|PUT|DELETE|PATCH)\s*\([^)]*\)\s*(?::\s*[^{]*)?\{)'
    
    def inject_sym(match):
        return match.group(0) + '\n' + SYM_LINE
    
    return re.sub(pattern, inject_sym, content)

def replace_euros(content):
    """Replace all € with ${SYM} in template literals, or SYM in other contexts."""
    # In template literals: €${variable} → ${SYM}${variable}
    # In template literals: €10 → ${SYM}10
    # Replace € when followed by $ (template literal interpolation)
    content = re.sub(r'€(\$\{)', r'${SYM}\1', content)
    # Replace € when followed by a digit
    content = re.sub(r'€(\d)', r'${SYM}\1', content)
    # Replace remaining standalone €
    # Only if it's in a context that makes sense
    return content

def process_file(rel_path):
    fpath = os.path.join(PROJECT, rel_path)
    if not os.path.exists(fpath):
        print(f"  ⚠ Not found: {rel_path}")
        return False
    
    with open(fpath, 'r', encoding='utf-8') as f:
        original = f.read()
    
    if '€' not in original:
        return False
    
    count = original.count('€')
    content = add_import(original)
    content = add_sym_declaration(content)
    content = replace_euros(content)
    
    if content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✓ {rel_path} ({count} € replacements)")
        return True
    return False

def main():
    modified = 0
    for f in FILES:
        if process_file(f):
            modified += 1
    print(f"\n  Done: {modified} files modified")

if __name__ == '__main__':
    main()

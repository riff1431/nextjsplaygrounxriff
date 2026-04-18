import re
import os

files = [
    "components/rooms/shared/SessionChatPanel.tsx",
    "components/rooms/x-chat/ChatPanel.tsx"
]

for f in files:
    if os.path.exists(f):
        with open(f, 'r') as fp:
            data = fp.read()
        
        # Insert import if missing
        if "UserBadgeDisplay" not in data:
            import_str = 'import UserBadgeDisplay from "@/components/shared/UserBadgeDisplay";\n'
            # find last import
            last_import = data.rfind("import ")
            end_of_last_import = data.find("\n", last_import)
            data = data[:end_of_last_import+1] + import_str + data[end_of_last_import+1:]
        
        # For SessionChatPanel.tsx
        if "SessionChatPanel.tsx" in f:
            data = data.replace(
                '{msg.username}\n                                    </span>',
                '{msg.username}\n                                    </span>\n                                    <UserBadgeDisplay userId={msg.user_id} />'
            )
            # Update inline
            data = re.sub(r'(<span className="text-gray-400 font-bold select-none cursor-pointer">)(\s*)(.*?)(</span>)', r'\1\2\3\4\n                                    <UserBadgeDisplay userId={msg.user_id} />', data)

        # For ChatPanel.tsx
        if "ChatPanel.tsx" in f:
            if "UserBadgeDisplay userId=" not in data:
                data = re.sub(
                    r'(<span className="text-primary font-medium text-sm">@.*?</span>)',
                    r'\1<UserBadgeDisplay userId={msg.user_id} />',
                    data
                )
        
        with open(f, 'w') as fp:
            fp.write(data)
        print("Updated", f)

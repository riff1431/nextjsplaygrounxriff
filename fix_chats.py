import os
import re

chat_files = [
    "components/rooms/truth-or-dare-creator/TodCreatorLiveChat.tsx",
    "components/rooms/suga4u-pg12-creator/LiveChat.tsx",
    "components/rooms/pgx-pg8/LiveChat.tsx",
    "components/rooms/pgx-pg1/LiveChat.tsx",
    "components/rooms/suga4u/LiveChat.tsx",
    "components/rooms/suga4u-v2/LiveChat.tsx",
    "components/rooms/suga4u-v5/LiveChat.tsx",
    "components/rooms/flash-drops/FlashDropLiveChat.tsx",
    "components/rooms/confessions/LiveChatBox.tsx",
    "components/rooms/shared/SessionChatPanel.tsx",
    "components/rooms/bar-lounge-creator/LoungeChat.tsx",
    "components/rooms/suga4u-creator/S4uLiveChat.tsx",
    "components/rooms/x-chat/ChatPanel.tsx",
    "components/rooms/competition/LiveChat.tsx",
    "components/rooms/x-chat-creator/LiveChat.tsx",
    "components/rooms/bar-lounge/LoungeChat.tsx",
    "components/rooms/confessions-creator/ConfessionsLiveChat.tsx"
]

for filepath in chat_files:
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            content = f.read()
        
        orig = content
        
        # Add pgx-chat-wrapper to root glass-card/container if it has h-full flex flex-col
        content = re.sub(r'className="(.*?flex flex-col.*?h-full.*?)"', r'className="\1 pgx-chat-wrapper"', content)
        
        # Fallback for SessionChatPanel.tsx which uses style
        if "SessionChatPanel.tsx" in filepath:
            content = content.replace(
                'overflow: "hidden",\n            }}', 
                'overflow: "hidden",\n            }}\n            className="pgx-chat-wrapper"'
            )
            content = content.replace(
                'flex: 1,\n                    overflowY: "auto",',
                'flex: 1,\n                    overflowY: "auto",\n                    display: "flex",\n                    flexDirection: "column",'
            )
            # Add classes to the messages div
            content = content.replace(
                '            <div\n                style={{\n                    flex: 1,\n                    overflowY: "auto",',
                '            <div\n                className="pgx-chat-messages hide-scrollbar"\n                style={{\n                    flex: 1,\n                    overflowY: "auto",'
            )
        else:
            # For Tailwind users
            content = re.sub(r'className="(.*?flex-1 overflow-y-auto.*?)"', r'className="\1 pgx-chat-messages hide-scrollbar"', content)
            # Also catch if it's already there or not standard
            content = re.sub(r'className="flex-1 overflow-y-auto"', 'className="flex-1 overflow-y-auto pgx-chat-messages hide-scrollbar"', content)
            # Find root divs that don't have flex flex-col but are the main wrapper
            content = re.sub(r'<div className="glass-card flex flex-col h-full min-h-\[400px\]">', '<div className="glass-card flex flex-col h-full pgx-chat-wrapper">', content)
            content = re.sub(r'className="(.*?chat-scroll.*?)"', r'className="\1 pgx-chat-messages hide-scrollbar"', content)

        if orig != content:
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"Updated {filepath}")

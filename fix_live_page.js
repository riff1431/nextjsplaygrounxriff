const fs = require('fs');
const path = 'app/creator/rooms/truth-or-dare/live/page.tsx';
let data = fs.readFileSync(path, 'utf8');

// 1. loadGameData active check
data = data.replace(
`                if (g.status === 'active') {
                    setSessionActive(true);
                    setSessionInfo({
                        title: g.session_title,
                        isPrivate: g.is_private,
                        price: g.unlock_price
                    });
                    // setIsInStudio(false); // Default to dashboard -> We want them entering studio from start? No, wait for them to click Start.
                    setShowStartModal(false);
                }`,
`                if (g.status === 'active') {
                    setSessionActive(true);
                    setSessionInfo({
                        title: g.session_title,
                        isPrivate: g.is_private,
                        price: g.unlock_price
                    });
                } else {
                    router.push('/creator/rooms/truth-or-dare');
                }`
);

// 2. Realtime ended check
data = data.replace(
`                    } else if (newData.status === 'ended') {
                        setSessionActive(false);
                        setSessionInfo(null);
                        setIsInStudio(false); // Force exit studio if ended remotely
                        setShowStartModal(false); // Return to Dashboard
                    }`,
`                    } else if (newData.status === 'ended') {
                        setSessionActive(false);
                        setSessionInfo(null);
                        router.push('/creator/rooms/truth-or-dare');
                    }`
);

// 3. Remove startSession which contains setIsInStudio
data = data.replace(/    async function startSession\(\) \{[\s\S]*?setIsCreatingSession\(false\);\n        \}\n    \}/, '');

// 4. End Session redirect
data = data.replace(
`            if (res.ok) {
                setSessionActive(false);
                setIsInStudio(false); // Exit Studio
                setSessionInfo(null);
                setShowStartModal(false); // Return to Dashboard
                setShowExitConfirmation(false); // Close Modal
            }`,
`            if (res.ok) {
                setSessionActive(false);
                setSessionInfo(null);
                setShowExitConfirmation(false);
                router.push('/creator/rooms/truth-or-dare');
            }`
);

// 5. Remove Dashboard render & Modal
const renderStart = data.indexOf('            {/* Dashboard View (History + Create/Resume Button) */}');
const renderEnd = data.indexOf('            {/* Main Dashboard - Only Render if In Studio */}');
if (renderStart !== -1 && renderEnd !== -1) {
    data = data.substring(0, renderStart) + data.substring(renderEnd);
}

// 6. Remove {isInStudio && ( 
data = data.replace(
`            {/* Main Dashboard - Only Render if In Studio */}
            {isInStudio && (
                <main className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto">`,
`            {/* Main Studio View */}
                <main className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto">`
);

// 7. Remove closing brace for isInStudio
data = data.replace(
`                    </aside>
                </main >
            )
            }

            {/* NEW: Cute Real-time Tip Alert Dialog */}`,
`                    </aside>
                </main >

            {/* NEW: Cute Real-time Tip Alert Dialog */}`
);

fs.writeFileSync(path, data);
console.log('Done!');

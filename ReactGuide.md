
Sample Code to retrieve map data and list it into a component
<!-- 
    {CATEGORIES.map((c) => (
        <NeoButton key={c} label={c} fontSize={14} isDark={category === c} onPressed={() => setCategory(c)} />
        ))} 
-->
<!-- 
    {modalOpen && (
    <NeoDialog
        isDark={isDark}
        ariaLabel="Item details"
        onBack={() => {}}              // omit to hide Back
        onClose={() => setModalOpen(false)}
    >
        {/* header row, stat bars, description, rows, related... exactly as before */}
    </NeoDialog>
    )} 
-->

<!-- interface Weapon {
  id: string;
  code: string;
  name: string;
  category: string;
  summary: string; // short, shown on the card
  description: string; // long, shown in the dialog
  image?: string;
  // stats: { label: string; value: number }[]; // 0-100
  rows: [string, string][]; // label / value pairs in the dialog
} -->

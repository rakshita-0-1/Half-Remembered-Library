const STEPS = [
  {
    num: '01.',
    title: 'Assign Sequential Record IDs',
    desc: 'Validated lowercase single-word titles (1–8 characters) receive strictly increasing IDs starting from 0, preserving insertion order.',
  },
  {
    num: '02.',
    title: 'Generate All Possible Suffixes',
    desc: 'For each catalog word such as catdog, all suffixes from the full word down to the empty suffix are generated in order.',
  },
  {
    num: '03.',
    title: 'Join With Separator #',
    desc: 'Every suffix is combined with the # delimiter and the original word: og#catdog, g#catdog, #catdog, and so on.',
  },
  {
    num: '04.',
    title: 'Propagate maxId Along Nodes',
    desc: 'Using a 27-child Trie (a–z plus #), every node along the inserted path updates node->maxId if the incoming record ID is higher.',
  },
  {
    num: '05.',
    title: 'Construct Query Path',
    desc: 'When searching prefix cat and suffix og, the C engine traverses og#cat without reversing the suffix or scanning titles.',
  },
  {
    num: '06.',
    title: 'Retrieve Latest Match in O(P + S)',
    desc: 'The maxId stored at the destination node immediately returns the newest matching record ID (or -1 if no path exists).',
  },
];

export function AboutPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            How The Half-Remembered Library Works
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Step-by-step walkthrough of the suffix-separator Trie and our three-module C architecture.
          </p>
        </div>

        <a
          href="/api/download"
          download="half-remembered-library.zip"
          className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border border-cyan-400/35 bg-cyan-400/15 px-4 py-2.5 text-sm font-semibold text-cyan-200 transition-colors hover:bg-cyan-400/25"
        >
          Download Project (.zip)
        </a>
      </div>

      {/* 6 Steps */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.num} className="glass-panel rounded-2xl p-5">
            <p className="font-mono text-sm font-bold text-cyan-300">{step.num}</p>
            <h3 className="mt-2 text-base font-bold text-white">{step.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{step.desc}</p>
          </div>
        ))}
      </div>

      {/* Visual Trie Diagram */}
      <section className="glass-panel rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white">
          Trie Traversal Diagram: <code className="text-cyan-300">catdog</code> (ID 2) &{' '}
          <code className="text-cyan-300">catalog</code> (ID 3)
        </h3>
        <p className="mt-1 text-sm text-slate-300">
          Searching prefix <code>cat</code> + suffix <code>og</code> walks{' '}
          <code>o → g → # → c → a → t</code> and reads <code>maxId = 3</code> directly.
        </p>

        <div className="mt-5 overflow-x-auto">
          <svg
            className="w-full min-w-[640px]"
            viewBox="0 0 760 220"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Trie diagram illustrating suffix separator prefix traversal"
          >
            <line x1="65" y1="105" x2="155" y2="105" stroke="#22D3EE" strokeWidth="2.5" />
            <line x1="155" y1="105" x2="245" y2="105" stroke="#22D3EE" strokeWidth="2.5" />
            <line x1="245" y1="105" x2="335" y2="105" stroke="#A78BFA" strokeWidth="2.5" />
            <line x1="335" y1="105" x2="425" y2="105" stroke="#22D3EE" strokeWidth="2.5" />
            <line x1="425" y1="105" x2="515" y2="105" stroke="#22D3EE" strokeWidth="2.5" />
            <line x1="515" y1="105" x2="605" y2="105" stroke="#38BDF8" strokeWidth="2.5" />
            <line
              x1="605"
              y1="105"
              x2="695"
              y2="60"
              stroke="#94A3B8"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
            <line x1="605" y1="105" x2="695" y2="155" stroke="#A78BFA" strokeWidth="2.5" />

            <g fontFamily="JetBrains Mono, monospace" textAnchor="middle">
              <circle cx="65" cy="105" r="24" fill="#131B3A" stroke="#C4B5FD" strokeWidth="2" />
              <text x="65" y="102" fill="#F8FAFC" fontSize="11" fontWeight="700">
                root
              </text>
              <text x="65" y="116" fill="#94A3B8" fontSize="9">
                max:5
              </text>

              <circle cx="155" cy="105" r="24" fill="#131B3A" stroke="#22D3EE" strokeWidth="2" />
              <text x="155" y="102" fill="#22D3EE" fontSize="14" fontWeight="700">
                o
              </text>
              <text x="155" y="116" fill="#94A3B8" fontSize="9">
                max:3
              </text>

              <circle cx="245" cy="105" r="24" fill="#131B3A" stroke="#22D3EE" strokeWidth="2" />
              <text x="245" y="102" fill="#22D3EE" fontSize="14" fontWeight="700">
                g
              </text>
              <text x="245" y="116" fill="#94A3B8" fontSize="9">
                max:3
              </text>

              <circle cx="335" cy="105" r="24" fill="#1E1646" stroke="#A78BFA" strokeWidth="2.4" />
              <text x="335" y="102" fill="#C4B5FD" fontSize="15" fontWeight="700">
                #
              </text>
              <text x="335" y="116" fill="#C4B5FD" fontSize="9">
                sep
              </text>

              <circle cx="425" cy="105" r="24" fill="#131B3A" stroke="#22D3EE" strokeWidth="2" />
              <text x="425" y="102" fill="#22D3EE" fontSize="14" fontWeight="700">
                c
              </text>
              <text x="425" y="116" fill="#94A3B8" fontSize="9">
                max:3
              </text>

              <circle cx="515" cy="105" r="24" fill="#131B3A" stroke="#22D3EE" strokeWidth="2" />
              <text x="515" y="102" fill="#22D3EE" fontSize="14" fontWeight="700">
                a
              </text>
              <text x="515" y="116" fill="#94A3B8" fontSize="9">
                max:3
              </text>

              <circle cx="605" cy="105" r="28" fill="#0F2942" stroke="#38BDF8" strokeWidth="2.8" />
              <text x="605" y="101" fill="#F8FAFC" fontSize="14" fontWeight="700">
                t
              </text>
              <text x="605" y="117" fill="#22D3EE" fontSize="10" fontWeight="700">
                maxId:3
              </text>

              <rect
                x="655"
                y="38"
                width="92"
                height="40"
                rx="10"
                fill="#131B3A"
                stroke="#64748B"
                strokeWidth="1.5"
              />
              <text x="701" y="55" fill="#CBD5E1" fontSize="11">
                ...dog
              </text>
              <text x="701" y="70" fill="#94A3B8" fontSize="9">
                ID 2 (catdog)
              </text>

              <rect
                x="655"
                y="135"
                width="92"
                height="40"
                rx="10"
                fill="#1E1646"
                stroke="#A78BFA"
                strokeWidth="2"
              />
              <text x="701" y="152" fill="#E9D5FF" fontSize="11">
                ...alog
              </text>
              <text x="701" y="167" fill="#C4B5FD" fontSize="9">
                ID 3 (catalog)
              </text>
            </g>

            <text
              x="335"
              y="196"
              textAnchor="middle"
              fill="#94A3B8"
              fontSize="12"
              fontFamily="DM Sans, sans-serif"
            >
              Final node maxId = 3 returns catalog in 6 pointer hops without scanning the catalog.
            </text>
          </svg>
        </div>
      </section>

      {/* Team Architecture */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs font-semibold text-cyan-300">Member 1 · Core Algorithm</p>
          <h4 className="mt-1.5 text-base font-bold text-white">Trie Indexing & Search</h4>
          <p className="mt-1.5 text-sm text-slate-300">
            <code>trie.h</code> &amp; <code>trie.c</code> — 27-child nodes, suffix-separator
            insertion, <code>O(P + S)</code> traversal, and recursive deallocation.
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs font-semibold text-cyan-300">Member 2 · Catalog Management</p>
          <h4 className="mt-1.5 text-base font-bold text-white">Independent Record Storage</h4>
          <p className="mt-1.5 text-sm text-slate-300">
            <code>catalog.h</code> &amp; <code>catalog.c</code> — sequential IDs from 0, duplicate
            support, strict lowercase validation, and <code>O(1)</code> title lookup.
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs font-semibold text-cyan-300">Member 3 · Integration & UI</p>
          <h4 className="mt-1.5 text-base font-bold text-white">Controller, Tests & Web UI</h4>
          <p className="mt-1.5 text-sm text-slate-300">
            <code>main.c</code>, <code>tests.c</code> &amp; Web App — single-build lifecycle,
            15 automated test assertions, search history, and responsive UI.
          </p>
        </div>
      </div>
    </div>
  );
}

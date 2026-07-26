// The one and only place the feature's business-rule numbers live
// (architectural req 4). Every metric definition — what counts as
// "improving", when a patient is eligible to be ranked "most improved",
// what accuracy is low enough to flag — resolves to a constant here, so the
// product can retune the whole feature from a single file without touching
// any component or aggregation function.

// The bucket label for attempts whose therapy domain can't be resolved
// (template deleted, or never had a domain). Product decision: query-time
// join, no migration, orphaned attempts fall here rather than being dropped.
export const UNCATEGORIZED_DOMAIN = "Uncategorized";

// Most Improved eligibility: a patient must have at least this many
// accuracy-countable attempts in BOTH comparison windows before a
// week-over-week delta is trustworthy enough to rank them. One lucky
// attempt must never crown someone "most improved" (architectural req 7).
export const MIN_ATTEMPTS_PER_WINDOW_FOR_IMPROVEMENT = 2;

// Caseload-status classification thresholds (percentage points).
//
//  - A weekly average below NEEDS_ATTENTION_ACCURACY flags the patient for
//    attention regardless of trend (a struggling patient who is improving is
//    still struggling).
//  - A week-over-week gain of at least IMPROVING_DELTA marks "improving".
//  - A week-over-week drop of at least DECLINING_DELTA marks "needs attention".
export const NEEDS_ATTENTION_ACCURACY = 60;
export const IMPROVING_DELTA = 5;
export const DECLINING_DELTA = 5;

// How many entries the ranking widgets (Most Improved / Most Active) show
// by default.
export const DEFAULT_RANKING_LIMIT = 5;

// A domain needs at least this many completed attempts before its average
// accuracy is treated as a meaningful "strongest/weakest" signal — so a
// single perfect attempt in one domain isn't announced as the patient's
// strength (architectural req 5).
export const MIN_DOMAIN_ATTEMPTS_FOR_SIGNAL = 3;

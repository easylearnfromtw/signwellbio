# SIGN WELL Subscriber 360 — Algorithm v1

## 1. Interest score
For each observation i about topic t:

contribution_i = event_weight × source_weight × intensity × exp(-λ × age_days)

λ = ln(2) / 45, so the default half-life is 45 days.

raw_t = Σ contribution_i
score_t = sigmoid(raw_t - 0.8)
confidence_t = 1 - exp(-Σ|contribution_i| / 3)

Explicit preferences, saves and shares are stronger signals than passive page views. Dismiss/negative feedback subtracts from a topic. Old signals decay automatically.

## 2. Newsletter rank
score(item) = 0.60 × affinity + 0.25 × editorial_quality + 0.15 × freshness

Affinity is the mean of topic score × confidence for the candidate article's topics. Already-seen items are excluded. Sensitive-personalization labels are excluded from the ordinary ranking pipeline.

## 3. Explainability
Store the strongest evidence contributions for each topic. UI may show: “You read/saved X, clicked Y, and explicitly selected Z.” Avoid exposing raw private social text unless the user explicitly requests it.

## 4. Cold start
Order of preference:
1. explicit topic choices;
2. SIGN WELL first-party reading/click signals;
3. authorized social topic observations;
4. editorial popularity fallback.

## 5. Hard inference blocks
The ordinary model must not create labels for political party/leaning, diagnosis/disease, mental health state, race/ethnicity, religion, sexual orientation, or other protected/sensitive identity inferences. If a user voluntarily supplies a sensitive fact and legal review permits storage, keep it in `sensitive_vault`, outside ranking.

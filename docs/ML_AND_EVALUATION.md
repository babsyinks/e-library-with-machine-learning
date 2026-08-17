# Recommendation method and evaluation

## Content representation

For resource \(i\), the service creates:

```text
document_i = title + title + abstract + tags + category
```

Repeating the title gives a modest, easy-to-explain weight to its usually dense
topic signal. `TfidfVectorizer` uses English stop words, unigrams and bigrams,
sublinear term frequency, and at most 50,000 features.

TF-IDF increases a term's weight when it is frequent in one document but not
common throughout the collection:

```text
tfidf(term, document) = tf(term, document) × log(N / df(term))
```

## User profile and rank

Each interaction contributes its resource vector. A download has weight 2 and
a view has weight 1. Weight halves every 90 days:

```text
weight(event) = event_weight × 0.5 ^ (age_days / 90)
profile(user) = weighted mean of interacted resource vectors
score(candidate) = cosine(profile, candidate_vector)
```

Previously seen items are excluded. Cosine similarity ranges from 0 (no shared
weighted terms) toward 1 (very similar direction). The UI explains the strongest
history item behind the profile; it does not claim causality or a percentage
probability.

For “More like this,” the source resource vector replaces the user profile, so
new users and new resources work immediately.

## Cold start

- No user history: popularity within the user's declared department; global
  popularity if the department has no approved resources.
- No resource interactions: metadata similarity still works.
- No similar vocabulary: the API falls back to popular resources in the same category.

## Offline evaluation

An Admin can call `POST /api/recommendations/evaluate`. For each user with at
least three distinct interacted resources:

1. Order their events by time.
2. Use the first 80% as training history and the last 20% as held-out behavior.
3. Remove held-out items already present in training.
4. Generate top-k unseen recommendations.
5. Compute:

```text
precision@k = relevant recommended items / k
recall@k    = relevant recommended items / held-out relevant items
```

The response reports the same metrics for a global popularity baseline. A
thesis claim should say the method is useful only if its test result materially
beats that baseline on enough users.

## Synthetic data, if required

If live usage is insufficient, generate users with documented department/topic
preferences, a controlled noise rate, time-ordered sessions and different view/
download probabilities. Keep synthetic rows clearly labelled in the research
dataset and never present synthetic results as live institutional behavior.

Limitations to state in the thesis: TF-IDF does not understand synonyms by
meaning, user history can become narrow, popularity favors older material, and
offline relevance inferred from clicks is not the same as learning outcome.

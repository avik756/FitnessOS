# FitnessOS: plan for learning from personal records

Date: 10 November 2026. Status: proposed experiments, not implemented models.

Avik asked for a plan covering all ML ideas in his phone notes. The current increment implements recording and review tools. It does not train a model, infer causes of bloating, estimate muscle gained, or issue forecasts. Faster set-entry controls and muscle highlighting were explicitly excluded from this increment.

## 1. Research before selecting models

Read these four starting papers and write a short evidence sheet for each: research question, population, inputs, measured outcome, validation method, errors, limitations, and relevance to one person's records in this app. Links were located for this plan; a full critical reading has not been completed.

1. [Mifflin et al. (1990), A new predictive equation for resting energy expenditure in healthy individuals](https://pubmed.ncbi.nlm.nih.gov/2305711/). Understand what the existing resting-energy calculation estimates, its population, and why it does not settle daily maintenance intake.
2. [Hall et al. (2011), Quantification of the effect of energy imbalance on bodyweight](https://pmc.ncbi.nlm.nih.gov/articles/PMC3880593/). Examine a dynamic physiological approach as a potential comparison for weight forecasting.
3. [Hall et al. (2011), Estimating changes in free-living energy intake and its confidence interval](https://pubmed.ncbi.nlm.nih.gov/21562087/). Investigate the assumptions and uncertainty involved in inferring intake changes from weight observations.
4. [Collins et al. (2024), TRIPOD+AI statement](https://pmc.ncbi.nlm.nih.gov/articles/PMC11019967/). Use its reporting questions to make data, targets, evaluation, limitations, and intended use explicit. Completing a reporting checklist would not itself validate our model.

Before bloating or hypertrophy modeling, add focused literature reviews with relevant outcome measurements and independent validation. These four starting papers do not validate those features. Select an India-relevant food source separately after checking its licence, portions, raw/cooked definitions, coverage, and update method. A food lookup table is not ML.

## 2. Data foundation

Available after this increment: dated sets with reps, load, units, load convention and optional workout-session links; body measurements and user-entered body fat; calorie entries with optional meal time; water amounts and optional time; manual steps; sleep intervals and quality; bloating, mood and energy ratings; custom foods and portions; private photos.

Before training, add the missing structure deliberately:

- Event time, UTC offset/timezone, original creation time, edit history, and source (manual, imported, voice-confirmed). Keep the activity date the person experienced. Preserve these through backup. Existing set backups regenerate creation timestamps on restore, so those timestamps cannot currently establish historical prediction-time availability.
- Explicit logging completeness for food, water, activity, and check-ins. Missing food does not mean no food; missing ratings do not mean no symptoms. Daily step totals cannot stand in for steps already taken before a midday prediction.
- Stable food identities, portion snapshots, ingredients/nutrients only where reliably known, and entry provenance. Current food logging saves a descriptive calorie snapshot, not a nutrient database.
- Exercise identity, equipment, technique/range-of-motion notes where needed, session time, and optionally effort/RIR. Current strength data lacks many of these comparability controls.
- A prediction ledger: prediction ID, issue time, target period, data cutoff, model/version, estimate/range, and eventual observed outcome. Never rewrite an old prediction after seeing its answer.

Use synthetic fixtures for development. Keep personal datasets, photos, fitted parameters, exports, and logs in ignored local storage. Photos are excluded from modeling by default. Any future photo analysis or external model service needs a separate, explicit product decision about what data leaves the computer. Account passwords and session secrets never belong in model input.

## 3. Experiments

| Idea | First target and inputs | Baseline and candidate | Evaluation and release condition |
| --- | --- | --- | --- |
| Bloating patterns | At an agreed check-in time, predict the next scheduled 0–4 bloating rating. Inputs may include earlier ratings, recorded meals/portions and times, water, sleep, activity completed so far, and time of day. | Baselines: most recent rating and typical rating at that time. Candidate: regularized ordinal regression; consider a small tree model only if there is enough varied data. | Chronological rating error, errors by time of day, and calibration if probabilities are shown. Evaluate on scheduled check-ins including symptom-free reports; symptom-triggered-only logging creates selection bias. Show associations and uncertainty, with no automatic food restriction advice. |
| Mood and energy | Predict each separately at the next scheduled check-in from earlier ratings and available sleep/activity/meal context. | Last rating and time-of-day average; then regularized ordinal regression. | Chronological error versus each baseline, missing-report patterns, and whether prompts become burdensome. Avoid mental-health labels or diagnoses. |
| Strength/progress | Predict reps at a specified load for the next comparable session, or load at a fixed rep target. Decide on one target before training. | Most recent comparable performance; then a small regularized regression with lagged session features. | Error in reps or kg/lb, grouped by exercise/equipment/load convention. Do not pool per-hand and total loads. Keep a new or changed exercise in insufficient-data mode. Do not treat logged work as measured physiological adaptation. |
| Weight trajectory | Forecast a short future window of recorded weight, initially 7 and 14 days. Inputs: prior standardized weight observations, completeness flags, and only available food/activity context. | Last weight and rolling average, then local trend/state-space model. Compare the research-based dynamic approach only after understanding and reproducing its assumptions. | Rolling-origin error by forecast horizon and interval coverage. Show ranges, horizon and data freshness. Avoid precise promises about when a target weight will be reached. |
| Maintenance energy | Explore a range of effective maintenance intake over a stable observation window, separate from the existing resting-energy estimate. | Explicit research-derived calculation with uncertainty before a learned model. | Requires sufficiently complete intake logs and consistent weight observations. Intake error and expenditure can be difficult to distinguish; abstain when the data cannot identify the quantity. No automatic calorie target changes. |
| Hypertrophy | First decide what measurable outcome would count as muscle growth and how it would be obtained. | No model yet. Start with standardized measurement trends and training records as observations. | Do not invent training labels from weight, strength, BMI, or photos. Research a defensible measurement protocol, its error and an appropriately labelled dataset before deciding feasibility. Without that, do not display grams or percentages of muscle gained. |
| Voice entry | Convert speech into a structured set draft with explicit exercise, reps, load and unit fields. | Current prototype: browser speech recognition plus a small deterministic parser. Later evaluate local speech recognition and more flexible parsing. | Field-level accuracy, unit errors, negations/corrections, latency, accents and gym noise. Require review and an explicit save; uncertainty must leave fields unresolved. |

The body-model idea is a later visualization task. Fitting a body mesh from measurements is not automatically a learned physiological model. Inferring body composition from photos would require its own consent, labelled data, and validation study; neither that nor muscle highlighting is part of the implemented work.

## 4. Common evaluation rules

1. Agree on the target, prediction time, horizon and acceptable error before fitting. Start with one experiment; weight forecasting is a candidate for a contained numerical baseline, while bloating is the more personally relevant research question. The choice is still open.
2. Collect a small usability pilot first to test consistent logging and prompt burden. Do not prescribe a universal number of days or rows as proof of readiness. Review label frequency, variation, missingness, autocorrelation and uncertainty to decide whether model evaluation is feasible.
3. Split by time. Train on earlier observations, tune on a subsequent block, and reserve a later untouched block. Use rolling-origin evaluation when feasible; keep observations from the same day/session together. Fit preprocessing only on each training window.
4. Reconstruct exactly what was known when a prediction would have been made. Backfilled meals, end-of-day step totals, future symptom reports, and corrected records must not leak into past predictors.
5. Report baseline and candidate performance on the same dates, sample counts, uncertainty and failures. A single good split is insufficient. If there is no consistent useful gain, keep the baseline or show descriptive history only.
6. Run prospective predictions in a hidden evaluation mode first. Store them before outcomes arrive. Review whether performance holds over time and whether the feature helps without encouraging unnecessary restriction or anxiety.
7. Only then expose an opt-in experiment showing its scope, data sufficiency, uncertainty, last update and observed error. Provide a disable control. Abstain for sparse data, missing critical inputs or a changed routine outside evaluated conditions.

## 5. Updating predictions as real observations arrive

For the weight idea, a new weigh-in should first be compared with the previously saved forecast. Store the error, then generate a new forecast using the expanded history. Updating a state estimate is different from retraining coefficients; select a reproducible update schedule after baseline evaluation. Do not adjust parameters simply to force a perfect fit to each new measurement. Track model versions and keep a last-known baseline to return to when errors worsen.

Apply the same ledger to strength, bloating and mood experiments. Log corrections without silently replacing the evidence used for older predictions. Review model degradation and logging gaps before retraining; never use future labels in feature construction.

## 6. Proposed implementation sequence

- **A — research notes and logging pilot:** finish the evidence sheets, choose one target, and identify missing collection fields. Deliver a target definition and a data dictionary Avik can explain.
- **B — reproducible dataset builder:** add a Python module that turns an explicitly selected local database into time-ordered examples, with unit checks, missingness flags and prediction-time cutoffs. Include tests for backfills, duplicate dates, unit changes and restored data.
- **C — baseline notebook/script:** produce baseline forecasts and a readable evaluation report with synthetic and then explicitly selected personal data. No UI prediction yet.
- **D — one candidate model:** create a virtual environment only when dependencies are needed; pin package versions. Keep training offline and separate from the request-serving process. Save the data schema, model version and evaluation alongside fitted parameters in ignored storage.
- **E — prospective evaluation:** save issued predictions and score later outcomes. Review errors and usefulness before enabling an opt-in UI.
- **F — repeat cautiously:** evaluate the next use case independently. A successful weight model does not validate bloating advice or hypertrophy estimates.

Possible later module boundaries: `backend/ml/dataset.py`, `baselines.py`, `evaluate.py`, `predict.py`; ignored `databases/models/` for model artifacts. These are proposals, not created modules or settled framework choices.

## 7. Current voice prototype boundary

The prototype accepts simple English commands and prepares an editable set form; it does not save automatically. Browser speech support varies and may use a remote service. This follows the [MDN SpeechRecognition documentation](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition). The interface discloses that before microphone use and includes a typed-command fallback. The parser's tests do not establish microphone accuracy, offline behavior, or fitness-domain model performance.

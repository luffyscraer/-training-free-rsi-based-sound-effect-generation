"""Export the five-review planning run; never substitute an earlier run's audio."""
import argparse
import json
import re
from pathlib import Path

SITE = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("experiment", type=Path)
    args = parser.parse_args()
    root = args.experiment
    protocol = read(root / "protocol.json")
    audit = read(root / "planning_audit.json")
    inputs = read(root / "inputs.json")
    supplemental = read(root / "supplemental_review_summary.json")
    supplement_ids = {c["case_id"] for c in supplemental["cases"]}
    old = read(SITE / "data/cases.json")
    cases = []
    for previous in old["cases"]:
        cid = previous["id"]
        folder = root / cid
        assert previous["text"] == inputs[cid]["text"], cid
        status = read(folder / "text_status.json")
        plan = read(folder / "event_plan.json")["events"]
        execution = {e["event_id"].removeprefix("track_"): e
                     for e in read(folder / "execution_items.json")}
        count = 0
        for rd in folder.glob("text_round_*"):
            attempts = list(rd.glob("review.attempt*.raw.json"))
            count += len(attempts) if attempts else int((rd / "review.raw.json").exists())
        assert count == 5, (cid, count)
        events = []
        for i, event in enumerate(plan, 1):
            eid = f"e{i:03d}"
            track = execution[eid]
            start = float(track["target_audible_onset_sec"])
            end = float(track["target_audible_offset_sec"])
            assert 0 <= start < end, (cid, eid)
            events.append({"id": eid, "anchor": event["anchor"], "kind": event["kind"],
                           "sound": event.get("sound_en") or f'Voice: {event.get("voice_text")}',
                           "voice_text": event.get("voice_text"),
                           "start": start, "end": end,
                           "start_anchor": track.get("onset_anchor_text"),
                           "end_anchor": track.get("offset_anchor_text")})
        assert len(execution) == len(events)
        cases.append({"id": cid, "events": events, "text_eval_responses": count,
                      "plan_versions": status.get("plan_versions"),
                      "model_passed": bool(status["passed"]), "audio_generated": False,
                      "independent_acceptance": False,
                      "supplemental_fifth_review": cid in supplement_ids,
                      "retained_previous_executable": bool(status.get("retained_previous_executable_after_failure"))})
    payload = {
        "revision": root.name, "previous_revision": old["revision"],
        "previous_models": {"planner": "qwen3.8-max", "text_eval": "qwen3.8-max",
                            "listener": "qwen3.8-omni-flash",
                            "assistance": "Iterative repairs and Codex-assisted evidence review; not unassisted first-pass outputs."},
        "models": {"planner": protocol["planner"], "text_eval": protocol["text_eval"],
                   "listener": Path(protocol["listener_model"]).name,
                   "listener_status": "Configured local NF4/4-bit service; no final mixed-audio review in this planning-only run."},
        "text_eval_limit_per_case": 5, "text_eval_responses": sum(c["text_eval_responses"] for c in cases),
        "model_passed": sum(c["model_passed"] for c in cases), "audio_generated": False,
        "main_run_seconds": audit["elapsed_seconds"],
        "counting_note": "Five returned text-review answers per case, including malformed replies; not five successful repairs. ZH01/ZH03 include a supplemental fifth review with an updated reviewer prompt and no new plan generation. Main runtime excludes these supplemental reviews.",
        "timeline_note": "New times are compiled targets on the input narration timeline, not rendered or perceptually measured onsets. They must not be used to seek the older mix, which can contain inserted pauses.",
        "comparison_note": "Different models, prompts and repair histories: a qualitative comparison, not a controlled model benchmark.",
        "cases": cases,
    }
    output = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    assert not re.search(r"/mnt/|/home/|github_pat_|sk-[A-Za-z0-9]", output)
    (SITE / "data/planning-comparison.json").write_text(output, encoding="utf-8")
    print(f"Exported {len(cases)} plans / {sum(len(c['events']) for c in cases)} events / {payload['text_eval_responses']} review replies; no audio copied.")


if __name__ == "__main__":
    main()

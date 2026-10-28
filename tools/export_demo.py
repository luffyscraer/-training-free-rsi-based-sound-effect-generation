"""Export only public, whitelisted fields and listening copies from a delivery.

Usage: python tools/export_demo.py /path/to/delivery/manifest.json
Does not edit experiment outputs. Requires ffmpeg on PATH.
"""
import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

SITE = Path(__file__).resolve().parents[1]
INFO = {
    'ZH01': ('The Floodgate', '守闸 · Stone, chains & rushing water', 'The opening atmosphere is an optional audiobook bed. Timber friction is audible in context, but exact object identity remains uncertain.'),
    'ZH02': ('The Printing House', '印坊 · A press, scattered paper & a warning', 'The added warning voice is brief; its separation from the narrator remains limited. The press can compete slightly with narration.'),
    'ZH03': ('A Night at the Inn', '寒夜客栈 · Fire, a falling lid & hurried steps', 'Rummaging uses hands-in-rice Foley. The texture suggests scraping and brushing, but does not uniquely identify a grain container.'),
    'ZH04': ('Shelter at the Mountain Shrine', '山祠避雨 · Thunder, dripping water & distant bells', 'Layered dripping continues beneath brief events. The animal call, bucket impact, and approaching bells were checked in their mixed context against a narration reference.'),
    'ZH05': ('The Painter’s Scroll', '画师与卷轴 · Window impact, rain & unfurling cloth', 'Listen for the window impact, paperweight, and canvas against the rain. A separate wind or hinge track is not assumed necessary for the same action.'),
    'EN01': ('The Sluice Keeper', 'Metal impacts against moving water', 'The plate impact and nail strike are separate events. Event locations use the executed timeline rather than approximate timestamps from listening reports.'),
    'EN02': ('A Warning in the Print Shop', 'Mechanical rhythm & a spoken intervention', 'The copper tap and its resonance are treated as one event. An added short voice performance is omitted from the narration-only reference.'),
    'EN03': ('The Blacksmith’s Hairpin', 'Wet steps, bellows & the forge', 'Bellows are supported by mixed-window listening evidence. Some small texture identities remain uncertain beneath the other foreground sounds.'),
    'EN04': ('The Storm-Damaged Shrine', 'A quiet rain bed & a sudden collapse', 'The rain is intentionally restrained beneath narration. The gust is subtle and its exact identity remains uncertain; listen for the warning bell and collapse.'),
    'EN05': ('Sacks at the Watermill', 'Leaves, wooden impacts & the mill', 'The mill is presented as a bounded foreground focus, not a claim that the physical mechanism stops. Floorboard contact is a subtle detail.'),
}
ORDER = ['ZH04', 'EN04', 'ZH05', 'EN02', 'ZH01', 'EN01', 'ZH02', 'EN03', 'ZH03', 'EN05']

def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))

def encode(source, target):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
                    '-i', str(source), '-vn', '-map_metadata', '-1', '-c:a', 'libmp3lame',
                    '-b:a', '192k', str(target)], check=True)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('manifest', type=Path)
    args = parser.parse_args()
    records = {r['case_id']: r for r in read(args.manifest)}
    media = SITE / 'media'
    plans = SITE / 'data' / 'plans'
    media.mkdir(exist_ok=True)
    plans.mkdir(parents=True, exist_ok=True)
    exported = []
    for cid in ORDER:
        r = records[cid]
        source = Path(r['audio_path'])
        wav = Path(r['delivery_audio'])
        assert hashlib.sha256(wav.read_bytes()).hexdigest() == r['audio_sha256']
        assert hashlib.sha256(source.read_bytes()).hexdigest() == r['audio_sha256']
        tracks = {t['event_id'].removeprefix('track_'): t for t in read(source.parent / 'tracks.json')}
        event_plan = read(r['event_plan'])['events']
        timing = {e['event_id']: e for e in read(r['timing_plan'])['events']}
        events = []
        for i, event in enumerate(event_plan, 1):
            eid = f'e{i:03d}'
            track = tracks[eid]
            start = float(track['start_sec'])
            end = start + float(track['duration_sec'])
            assert 0 <= start < end <= r['duration_sec'] + .01, (cid, eid)
            events.append({
                'id': eid, 'anchor': event['anchor'], 'kind': event['kind'],
                'sound': event.get('sound_en') or f"Voice: {event.get('voice_text')}",
                'voice_text': event.get('voice_text'),
                'start': round(start, 3), 'end': round(end, 3),
                'start_anchor': timing[eid].get('start_span'),
                'end_anchor': timing[eid].get('end_span'),
            })
        assert len(events) == r['event_count'] == len(tracks)
        title, subtitle, note = INFO[cid]
        item = {'id': cid, 'language': 'zh' if cid.startswith('ZH') else 'en',
                'title': title, 'subtitle': subtitle, 'text': r['source_text'],
                'duration': round(r['duration_sec'], 3), 'note': note,
                'mix': f'media/{cid}-mix.mp3', 'narration': f'media/{cid}-narration.mp3',
                'wav': f'media/{cid}.wav', 'plan': f'data/plans/{cid}.json', 'events': events,
                'wav_sha256': r['audio_sha256']}
        (plans / f'{cid}.json').write_text(json.dumps(item, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        shutil.copyfile(wav, media / f'{cid}.wav')
        encode(wav, media / f'{cid}-mix.mp3')
        encode(source.parent / 'narration_control_matched.wav', media / f'{cid}-narration.mp3')
        exported.append(item)
        print(f'{cid}: {len(events)} events, {item["duration"]} sec', flush=True)
    payload = {'title': 'Training-free RSI-based Sound Effect Generation',
               'collection': 'Curated full excerpts; not a controlled benchmark', 'cases': exported}
    serialized = json.dumps(payload, ensure_ascii=False, indent=2) + '\n'
    assert '/mnt/' not in serialized and '/home/' not in serialized
    (SITE / 'data' / 'cases.json').write_text(serialized, encoding='utf-8')
    print(f'Exported {len(exported)} excerpts / {sum(len(c["events"]) for c in exported)} events.')

if __name__ == '__main__':
    main()

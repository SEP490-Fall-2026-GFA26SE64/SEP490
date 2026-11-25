"""Create a draft synthetic RQ1 cohort and EMPTY expert-label forms.
No recommendation scores, gold answers, real users, imports or benchmark runs.
Existing output is immutable: choose a new --output directory for a revision.
"""
from pathlib import Path
import argparse, collections, hashlib, itertools, json, random, shutil
ROOT=Path(__file__).resolve().parents[1]
SEED=20261123
LEVELS=['Junior','Middle','Senior']
BANDS={'LOW':(1,2),'MEDIUM':(3,5),'HIGH':(6,9)}
HISTORIES=['BASELINE_ONLY','MIXED','OFFICIAL_RICH']
VERSION='rq1-profiles-0.1'
def canonical(x):return json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':'))
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write_json(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def write_lines(p,rows):p.write_text(''.join(canonical(r)+'\n' for r in rows))
def pair_key(x):return x['skillId']+'|'+x['knowledgeLevel']
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--output',type=Path,default=ROOT/'data/rq1/profiles-v0.1');args=ap.parse_args();out=args.output
 if out.exists():raise SystemExit('Output exists. Preserve this cohort; use a new directory for revisions.')
 cat=ROOT/'data/rq1/application-developer-v0.1'
 cm=json.loads((cat/'manifest.json').read_text())
 for n,h in cm['files'].items():
  if digest(cat/n)!=h:raise SystemExit('Catalog checksum mismatch: '+n)
 rng=random.Random(SEED)
 requirements=json.loads((cat/'requirements.json').read_text());skills=json.loads((cat/'skills.json').read_text());modules=json.loads((cat/'modules.json').read_text())
 skillmap={s['id']:s for s in skills}
 target={l:sorted([{'skillId':r['skillId'],'skillVersion':r['skillVersion'],'knowledgeLevel':k} for r in requirements if r['roleLevel']==l for k in r['requiredKnowledgeLevels']],key=pair_key) for l in LEVELS}
 # Prespecified allocation, independent of any algorithm outputs or expert judgments.
 slots=[]
 for li,l in enumerate(LEVELS):
  for bi,b in enumerate(BANDS):
   for i in range(50):slots.append((l,b,HISTORIES[(i+bi)%3],'development'))
   gold_count=([6,6,5] if li<2 else [6,5,5])[bi]
   for i in range(gold_count):slots.append((l,b,HISTORIES[(i+bi+li)%3],'gold50'))
 rng.shuffle(slots)
 accepted=collections.defaultdict(list);profiles=[];attempts=0
 for idx,(level,band,history,split) in enumerate(slots,1):
  req=target[level];keys=[pair_key(x) for x in req]
  for retry in range(20000):
   attempts+=1;size=rng.randint(*BANDS[band]);need=set(rng.sample(keys,size))
   # Screen across both splits before assignment is published; semantic similarity is disclosed.
   if all(len(need&prev)/len(need|prev)<0.8 for prev in accepted[level]):break
  else:raise RuntimeError('Unable to satisfy prespecified gap diversity')
  accepted[level].append(need)
  covered=[k for k in keys if k not in need];rng.shuffle(covered)
  fraction={'BASELINE_ONLY':0,'MIXED':.35,'OFFICIAL_RICH':.70}[history]
  official=set(covered[:round(len(covered)*fraction)])
  pid='SYN-'+hashlib.sha256(f'{SEED}|{idx}'.encode()).hexdigest()[:12].upper()
  evidence=[];baseline=[];states=[]
  for r in req:
   key=pair_key(r)
   if key in official:
    state='OFFICIALLY_ACHIEVED'
    evidence.append({**r,'evidenceId':'SYN-EV-'+hashlib.sha256(f'{pid}|{key}'.encode()).hexdigest()[:14].upper(),'recordType':'SYNTHETIC_OFFICIAL_EVIDENCE','evidenceOrigin':'SIMULATED_PRIOR_MODULE_AND_SKILL_ASSESSMENT','compatible':True,'isRealAchievement':False})
   else:
    passed=key not in need;state='BASELINE_EXEMPT' if passed else 'NEEDS_LEARNING'
    baseline.append({**r,'outcome':'PASSED' if passed else 'FAILED','recordType':'SYNTHETIC_BASELINE_GROUP_RESULT','grantsOfficialAchievement':False})
   states.append({**r,'state':state})
  learning=[r.copy() for r in req if pair_key(r) in need]
  profiles.append({'profileId':pid,'recordType':'SYNTHETIC_RESEARCH_PROFILE','datasetVersion':VERSION,'catalogVersion':cm['version'],'organizationId':'RESEARCH-AD-ORG','roleId':'ROLE-F72E5464F9B3','roleLevel':level,'roleLevelId':'RQL-AD-'+level.upper(),'split':split,'gapBand':band,'evidenceHistoryStratum':history,'snapshotPhase':'AFTER_BASELINE_BEFORE_EXPERT_REVIEW','targetRequirements':req,'officialEvidence':evidence,'baselineObservations':baseline,'requirementStates':states,'learningNeeds':learning,'carriedSupplementaryRequirements':[],'needsExpertAction':False,'gapCount':len(learning),'gapSignature':hashlib.sha256(canonical(sorted(need)).encode()).hexdigest(),'humanValidationStatus':'PENDING','goldLabelStatus':'PENDING_EXPERT_ANNOTATION' if split=='gold50' else 'NOT_APPLICABLE','demographics':None})
 profiles.sort(key=lambda p:p['profileId'])
 dev=[p for p in profiles if p['split']=='development'];gold=[p for p in profiles if p['split']=='gold50']
 # Nine level-by-gap cells, plus one additional Middle/MIXED example when available.
 pilot=[]
 for l in LEVELS:
  for b in BANDS:pilot.append(next(p['profileId'] for p in dev if p['roleLevel']==l and p['gapBand']==b and p['profileId'] not in pilot))
 pilot.append(next(p['profileId'] for p in dev if p['roleLevel']=='Middle' and p['evidenceHistoryStratum']=='MIXED' and p['profileId'] not in pilot))
 out.mkdir(parents=True);(out/'catalog-snapshot').mkdir();(out/'annotation').mkdir()
 for p in cat.iterdir():
  if p.is_file() and (p.suffix=='.json' or p.name in ['MODULE_CARDS.md','COMPETENCY_MATRIX.md','PREREQUISITES.md']):
   shutil.copy2(p,out/'catalog-snapshot'/('source-catalog-manifest.json' if p.name=='manifest.json' else p.name))
 (out/'catalog-snapshot/README.md').write_text('# Pinned catalog inputs\n\nThis directory preserves the data JSON and readable module/competency/prerequisite cards used for profile generation. source-catalog-manifest.json describes the complete original catalog package, including documentation not copied here. Relative source paths in sources.json are relative to the original catalog directory, not this snapshot. The parent profile manifest hashes all retained files. See the [original catalog guide](../../application-developer-v0.1/README.md) for review instructions; it may evolve independently of this pinned snapshot.\n')
 write_lines(out/'profiles.jsonl',profiles);write_lines(out/'development450.jsonl',dev);write_lines(out/'gold50-profiles.jsonl',gold)
 write_json(out/'splits.json',{'development':[p['profileId'] for p in dev],'gold50':[p['profileId'] for p in gold],'pilot10':pilot})
 # Separate independent templates; reviewer slots are workflow positions, not fake people.
 for slot in ['A','B']:
  rows=[]
  for p in gold:
   order=modules.copy();random.Random(f'{SEED}|{p["profileId"]}').shuffle(order)
   for pos,m in enumerate(order,1):
    rows.append({'recordType':'BLANK_ANNOTATION_TEMPLATE','reviewerSlot':slot,'reviewerId':None,'datasetVersion':VERSION,'protocolVersion':'0.2','profileId':p['profileId'],'moduleId':m['id'],'moduleRevision':m['revision'],'contentVersion':m['contentVersion'],'displayPosition':pos,'judged':False,'grade':None,'reason':None,'preferredRank':None,'annotatedAt':None})
  write_lines(out/f'annotation/reviewer-{slot}.template.jsonl',rows)
 write_lines(out/'annotation/adjudication.template.jsonl',[{'recordType':'BLANK_ADJUDICATION_TEMPLATE','profileId':p['profileId'],'datasetVersion':VERSION,'status':'PENDING_INDEPENDENT_REVIEWS','acceptedModuleIds':None,'preferredTop5':None,'adjudicatorId':None,'adjudicatedAt':None,'sourceAnnotationReferences':[],'notes':None} for p in gold])
 def cards(selected):
  lines=['# Synthetic learner review cards','','These are draft synthetic inputs, not real employees and not gold answers. Official evidence below is simulated. Baseline passes exempt initial learning only. No module recommendations or teaching bindings are supplied.','']
  for p in selected:
   lines += [f"## {p['profileId']} — {p['roleLevel']}",'',f"Target: Application Developer web full-stack. Initial needs: {p['gapCount']} groups. Simulated official evidence: {len(p['officialEvidence'])} groups. Baseline passes: {sum(x['outcome']=='PASSED' for x in p['baselineObservations'])} groups.",'','### Initial learning needs','']
   for n in p['learningNeeds']:
    s=skillmap[n['skillId']];lines += [f"- {s['name']} / {n['knowledgeLevel']}: {s['definition']}"]
   lines+=['','### Remaining target requirements','', '| Skill | Knowledge group | Current state |','|---|---|---|']
   for x in p['requirementStates']:
    if x['state']!='NEEDS_LEARNING':lines.append('| '+' | '.join([skillmap[x['skillId']]['name'],x['knowledgeLevel'],x['state']])+' |')
   lines+=['']
  return '\n'.join(lines)+'\n'
 (out/'GOLD50_REVIEW_CARDS.md').write_text(cards(gold));(out/'PILOT10_REVIEW_CARDS.md').write_text(cards([p for p in dev if p['profileId'] in pilot]))
 overview=['# Profile inventory','','500 synthetic inputs; no independently judged gold answers.','', '| Profile | Split | Role level | Gap band | Gap count | Evidence stratum |','|---|---|---|---|---|---|']
 for p in profiles:overview.append('| '+' | '.join(str(p[k]) for k in ['profileId','split','roleLevel','gapBand','gapCount','evidenceHistoryStratum'])+' |')
 (out/'PROFILE_INDEX.md').write_text('\n'.join(overview)+'\n')
 dist={s:{'total':len(rows),'roleLevels':dict(collections.Counter(p['roleLevel'] for p in rows)),'gapBands':dict(collections.Counter(p['gapBand'] for p in rows)),'evidenceHistories':dict(collections.Counter(p['evidenceHistoryStratum'] for p in rows))} for s,rows in [('development',dev),('gold50',gold)]}
 write_json(out/'distribution.json',dist)
 (out/'README.md').write_text('''# Bộ 500 hồ sơ synthetic cho RQ1

Ngày 23/11/2026. **Đã tạo 500 hồ sơ draft: 450 development và 50 dành cho golden set. Nhóm 50 chưa có nhãn chuyên gia, chưa phải golden set đã kiểm chứng.** Người dùng cho phép chuẩn bị hồ sơ trên catalog draft; việc này không thay cho duyệt catalog hoặc khóa thiết kế trước thực nghiệm cuối.

## Phân chia

| Tập | Junior | Middle | Senior | Tổng |
|---|---:|---:|---:|---:|
| Development | 150 | 150 | 150 | 450 |
| Gold50 chờ gắn nhãn | 17 | 17 | 16 | 50 |

10 hồ sơ pilot nằm trong development450, không phải cộng thêm. Không có tên thật, email hay thông tin nhân sự. Mỗi hồ sơ mô tả một trạng thái người học giả lập ngay sau baseline, trước Expert review.

## Đọc và sử dụng file

- [PROFILE_INDEX.md](PROFILE_INDEX.md): bảng tra đủ 500 hồ sơ, cấp, số nhu cầu và nhóm bằng chứng.
- profiles.jsonl: toàn bộ 500 hồ sơ; mỗi dòng là một JSON độc lập.
- development450.jsonl: dữ liệu dùng phát triển; không dùng kết quả trên tập này làm đánh giá cuối.
- gold50-profiles.jsonl: 50 đầu vào đánh giá cuối, chưa có đáp án.
- [GOLD50_REVIEW_CARDS.md](GOLD50_REVIEW_CARDS.md): bản dễ đọc cho chuyên gia xem nhu cầu và bằng chứng giả lập.
- [PILOT10_REVIEW_CARDS.md](PILOT10_REVIEW_CARDS.md): 10 trường hợp pilot từ development.
- splits.json: danh sách ID cố định của ba nhóm.
- distribution.json: phân bố cấp, số nhu cầu và lịch sử bằng chứng.
- catalog-snapshot/: bản sao dữ liệu catalog dùng để tạo hồ sơ, có version/hash; không phụ thuộc việc catalog gốc thay đổi về sau.
- annotation/reviewer-A.template.jsonl và reviewer-B.template.jsonl: hai bộ phiếu trống độc lập, mỗi bộ 50 × 72 = 3.600 hàng. A/B là vị trí người chấm, chưa gán danh tính. Có đủ hàng để hỗ trợ chấm toàn catalog; đây không phải quyết định bắt buộc chấm hết trước khi pilot xác định công sức.
- annotation/adjudication.template.jsonl: 50 phiếu thống nhất đáp án còn trống; acceptedModuleIds và preferredTop5 là null, không phải danh sách rỗng nghĩa là không có module phù hợp.
- manifest.json: seed, cấu hình, nguồn, checksum và giới hạn nghiên cứu.

## Quy tắc tạo nhu cầu

Mọi yêu cầu dùng đúng skill/version/knowledge của catalog. Thành tích giả lập tương thích loại yêu cầu đó khỏi nhu cầu học ban đầu. Baseline pass cũng miễn học ban đầu nhưng không tạo achievement. Baseline fail khi chưa có thành tích tạo nhu cầu học. Các nhóm đã có thành tích không được gán thêm kết quả baseline mâu thuẫn. Không suy ra kiến thức thấp từ kiến thức cao và không tự mở rộng prerequisite chưa đánh giá.

Chỉ mô hình hóa các nhóm mục tiêu đã chọn, không có supplementary history. Đây là mô hình dữ liệu offline đã đối chiếu quy tắc nguồn, chưa chạy adapter để chứng minh parity với toàn bộ service thật. Evidence IDs bắt đầu SYN là giả lập, không phải khóa dữ liệu đã tồn tại trong ứng dụng. RoleLevelId RQL-AD-* là mã research, không dùng để import API.

## Thiết kế phân bố

Ba nhóm số nhu cầu: LOW 1–2, MEDIUM 3–5, HIGH 6–9. Mỗi nhóm có 150 development; gold có 18/17/15 tương ứng. Ba kiểu lịch sử: chỉ baseline; khoảng 35% nhóm ngoài nhu cầu có thành tích giả lập; khoảng 70% có thành tích. Phần còn lại ngoài nhu cầu là baseline pass. Tỷ lệ này là giả định tạo dữ liệu, không phải số liệu người học thật.

Seed 20261123. Hồ sơ được tạo theo cùng quy tắc cho cả hai tập, với thứ tự slot xáo trộn trước khi lấy mẫu. Không dựa vào kết quả thuật toán để chọn tập cuối. Không có hai hồ sơ cùng role level trùng tập nhu cầu; các tập nhu cầu có Jaccard từ 0.8 trở lên bị loại khi tạo. Bộ lọc chỉ kiểm tra tương đồng cấu trúc, không chứng minh độc lập ngữ nghĩa. Chia tập này đánh giá trong cùng phân bố synthetic, không chứng minh khả năng khái quát ra nhân viên thật.

Tất cả 500 hồ sơ có nhu cầu module-based dương. Không dùng tập này để khẳng định đã kiểm tra no-gap, certificate-only, thiếu module hoặc bằng chứng không tương thích; các ca robustness cần bộ riêng sau này. Có module được ánh xạ tới mọi nhu cầu không đồng nghĩa chuyên gia chắc chắn cho grade 2.

## Chuyển nhóm 50 thành golden set thật

1. Rà catalog và tính hợp lý của hồ sơ. Nếu sửa nội dung hoặc requirements, tạo phiên bản dữ liệu mới và giữ phiên bản này để truy vết.
2. Dùng pilot10 để thử rubric và đo công sức. Chốt phạm vi gắn nhãn và thuật toán trước khi lộ nhãn gold50 cho người phát triển.
3. Hai chuyên gia thật chấm độc lập. Không hiển thị teaching-bindings hoặc xếp hạng thuật toán. Phiếu chỉ có module IDs; dùng thẻ module tương ứng từ snapshot. Thứ tự phiếu đã xáo trộn theo từng hồ sơ; không dùng thứ tự biên soạn của module cards làm thứ hạng.
4. Giữ phiếu độc lập; ghi nhận bất đồng và quyết định thống nhất bằng danh tính/thời gian thật. Không coi module chưa chấm là grade 0, và không giới hạn relevance vào đúng năm module nếu còn lựa chọn tương đương.
5. Chỉ ghi goldStatus=VERIFIED trong phiên bản tiếp theo khi đủ bằng chứng và kiểm tra; không tự sửa template thành nhãn giả.

## Kiểm tra và tái lập

Dùng tools/validate_rq1_profiles.py từ thư mục research để kiểm tra số lượng, phiên bản, suy ra nhu cầu, chia tập, nhãn trống và checksum. Builder tools/build_rq1_profiles.py từ chối ghi đè thư mục đã tồn tại; dùng --output với thư mục mới khi tái lập. Không chỉnh file dữ liệu tại chỗ vì sẽ làm sai checksum. Các phiếu chuyên gia đã điền phải lưu riêng, giữ nguyên template.
''')
 manifest={'datasetId':'rq1-application-developer-profiles','version':VERSION,'createdOn':'2026-11-23','schemaVersion':1,'protocolVersion':'0.2','seed':SEED,'profileCount':500,'developmentCount':450,'goldProfileCount':50,'pilotCount':10,'expertJudgmentCount':0,'goldStatus':'AWAITING_EXPERT_LABELS','phase':'DRAFT_PRE_EXPERT_REVIEW','frozen':False,'catalogReviewStatus':cm['reviewStatus'],'catalogManifestSha256':digest(cat/'manifest.json'),'generatorSha256':digest(Path(__file__)),'samplingAttempts':attempts,'nearDuplicateRule':'Same-role gap-set Jaccard must be strictly below 0.8 across all accepted profiles, regardless of split. This is a structural similarity screen, not proof of semantic independence.','gapBandDefinitions':BANDS,'officialEvidenceFractionsOfNonGapGroups':{'BASELINE_ONLY':0,'MIXED':.35,'OFFICIAL_RICH':.70},'runtimeParity':'NOT_VERIFIED','limitations':['Draft catalog has no expert approval; later catalog changes require a new dataset version.','All profiles have 1–9 module-based initial needs; no-gap, certificate-only, missing-provision, conflicting and incompatible-evidence robustness cases are outside this cohort.','Only selected role target groups are modeled; no carried/lower-history supplementary work.','Synthetic group outcomes are not scored quiz attempts or real achievements.','The same prespecified sampler generates both splits; this is not evidence of out-of-distribution generalization.','No ranking results or human relevance labels exist.'],'files':{str(p.relative_to(out)):digest(p) for p in sorted(out.rglob('*')) if p.is_file()}}
 write_json(out/'manifest.json',manifest)
 print(json.dumps(dist,indent=2))
if __name__=='__main__':main()

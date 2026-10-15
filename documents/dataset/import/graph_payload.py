"""Transform validated flat catalog records into the Neo4j property contract."""
from collections import defaultdict
from validate_dataset import LABELS, require
EXPORT_ONLY_FIELDS={'TargetRole':('occupationId',),'Level':('targetRoleId',),'Competency':('levelId',)}
def properties(row,omit=()):
    props={k:v for k,v in row.items() if k not in omit and v is not None}
    require(all(type(v) in (str,bool,int,float) for v in props.values()),'Only scalar graph properties are allowed')
    return props

def build_payload(data):
    nodes,edges,batches={},{},defaultdict(list)
    for section,label in LABELS.items():
        for row in data[section]:
            props=properties(row,EXPORT_ONLY_FIELDS.get(label,()))
            nodes[row['id']]=([label],props);batches[label].append(props)
    for row in data['relationships']:
        edges[row['id']]=(row['type'],row['fromId'],row['toId'],properties(row,('type','fromId','toId')))
    return nodes,edges,batches

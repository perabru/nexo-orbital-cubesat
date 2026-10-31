"""Validação didática de pacotes NDJSON. Não abre porta serial."""
import json,math
from datetime import datetime
from pathlib import Path
def validate(text):
    rows=[];seen=set();previous=None;session=None
    for line_no,line in enumerate(text.splitlines(),1):
        if not line.strip():continue
        p=json.loads(line)
        assert p['origin']=='synthetic',f'linha {line_no}: origem inesperada no exercício'
        assert isinstance(p['seq'],int) and not isinstance(p['seq'],bool) and p['seq']>=0
        token=(p['session'],p['seq']);assert token not in seen,'pacote duplicado';seen.add(token)
        assert p['unit']=='degC' and math.isfinite(float(p['value']))
        assert p['t_utc'].endswith('Z');stamp=datetime.fromisoformat(p['t_utc'].replace('Z','+00:00'))
        assert previous is None or stamp>previous,'tempo fora de ordem'
        assert session is None or session==p['session'],'sessão mudou sem separação'
        previous=stamp;session=p['session'];rows.append(p)
    assert rows,'arquivo vazio'
    return {'pacotes':len(rows),'sessao':session,'origem':'sintética','media_degC':sum(float(p['value']) for p in rows)/len(rows)}
if __name__=='__main__':
    print(json.dumps(validate(Path(__file__).with_name('telemetria_demo.ndjson').read_text()),ensure_ascii=False,indent=2))

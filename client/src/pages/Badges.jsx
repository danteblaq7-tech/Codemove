import { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import { api } from '../api';

export default function Badges() {
  const [b, setB] = useState([]);
  useEffect(() => { api('/badges').then(setB).catch(() => {}); }, []);
  return (<><h1>Badges</h1><div className="grid">
    {b.map((x) => (<div key={x.id} className={`card badge ${x.badge_type === 'special' ? 'special' : x.status}`}>
      <div className="trophy"><Award aria-hidden="true" /></div><h3>{x.name}</h3><p>{x.description}</p></div>))}</div></>);
}

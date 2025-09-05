import React from 'react'
import { SearchResult, thumbUrl } from '../api'

interface TripsViewProps {
  dir: string
  engine: string
  setBusy: (busy: string) => void
  setNote: (note: string) => void
  setResults: (results: SearchResult[]) => void
}

export default function TripsView({
  dir, engine, setBusy, setNote, setResults
}: TripsViewProps) {
  
  const handleBuildTrips = async () => {
    try{ 
      const { apiTripsBuild } = await import('../api'); 
      setBusy('Grouping trips…'); 
      const r = await apiTripsBuild(dir, engine); 
      setBusy(''); 
      (window as any)._trips = r.trips || []; 
      setNote(`Trips: ${r.trips?.length||0}`) 
    } catch(e:any){ 
      setBusy(''); 
      setNote(e.message) 
    }
  }
  
  const handleRefreshTrips = async () => {
    try{ 
      const { apiTripsList } = await import('../api'); 
      const r = await apiTripsList(dir); 
      (window as any)._trips = r.trips || []; 
      setNote(`Loaded ${r.trips.length} trips`) 
    } catch(e:any){ 
      setNote(e.message) 
    }
  }
  
  const handleOpenTrip = (trip: any) => {
    setResults((trip.paths||[]).map((p:string)=>({path:p, score:1.0}))); 
    setNote('Opened trip')
  }
  
  return (
    <div className="bg-white border rounded p-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Trips</h2>
        <div className="flex gap-2">
          <button onClick={handleBuildTrips} className="bg-gray-200 rounded px-3 py-1 text-sm">Build</button>
          <button onClick={handleRefreshTrips} className="bg-gray-200 rounded px-3 py-1 text-sm">Refresh</button>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
        {(window as any)._trips?.slice(0,6)?.map((t:any,ti:number)=> (
          <div key={t.id||ti} className="border rounded p-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold truncate" title={t.place||''}>{t.place || 'Trip'}</div>
              <div>{t.count}</div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1">
              {(t.paths||[]).slice(0,3).map((p:string,i:number)=> (<img key={i} src={thumbUrl(dir, engine, p, 196)} className="w-full h-16 object-cover rounded" />))}
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={()=>handleOpenTrip(t)} className="bg-blue-600 text-white rounded px-3 py-1">Open</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
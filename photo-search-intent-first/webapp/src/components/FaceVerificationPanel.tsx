import React, { useState, useEffect } from 'react'
import { AdvancedRecognitionService, FaceVerification } from '../services/AdvancedRecognitionService'

interface FaceVerificationPanelProps {
  imagePath: string
  detectedFaces?: any[]
  knownPeople: Map<string, { name: string; photos: string[] }>
  onVerify: (clusterId: string, verified: boolean) => void
  onCreateNew: (name: string) => void
}

export function FaceVerificationPanel({
  imagePath,
  detectedFaces = [],
  knownPeople,
  onVerify,
  onCreateNew
}: FaceVerificationPanelProps) {
  const [verifications, setVerifications] = useState<FaceVerification[]>([])
  const [selectedFace, setSelectedFace] = useState<number>(0)
  const [newPersonName, setNewPersonName] = useState('')
  const [showNewPersonForm, setShowNewPersonForm] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function verifyFaces() {
      if (!detectedFaces.length) return
      
      setLoading(true)
      try {
        const results = await AdvancedRecognitionService.verifyFaces(
          imagePath,
          detectedFaces,
          knownPeople
        )
        setVerifications(results)
      } catch (error) {
        console.error('Face verification failed:', error)
      } finally {
        setLoading(false)
      }
    }
    
    verifyFaces()
  }, [imagePath, detectedFaces, knownPeople])

  const handleVerify = (clusterId: string, accept: boolean) => {
    onVerify(clusterId, accept)
    
    // Update local verification state
    setVerifications(prev => prev.map(v => 
      v.clusterId === clusterId 
        ? { ...v, verified: accept }
        : v
    ))
  }

  const handleCreateNew = () => {
    if (!newPersonName.trim()) return
    
    onCreateNew(newPersonName)
    setNewPersonName('')
    setShowNewPersonForm(false)
  }

  if (!detectedFaces.length) {
    return (
      <div className="p-4 bg-gray-50 rounded">
        <p className="text-gray-500 text-sm">No faces detected in this photo</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded">
        <p className="text-gray-500 text-sm">Analyzing faces...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Face Recognition</h3>
        <span className="text-sm text-gray-500">
          {detectedFaces.length} face{detectedFaces.length !== 1 ? 's' : ''} detected
        </span>
      </div>

      {/* Face selector */}
      {detectedFaces.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {detectedFaces.map((face, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedFace(idx)}
              className={`relative w-16 h-16 rounded overflow-hidden border-2 transition-colors ${
                selectedFace === idx ? 'border-blue-500' : 'border-gray-300'
              }`}
            >
              {/* Face thumbnail would go here */}
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-xs font-medium">{idx + 1}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Verification results */}
      {verifications[selectedFace] && (
        <div className="space-y-3">
          {verifications[selectedFace].suggested ? (
            <div className="p-3 bg-blue-50 rounded">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium">
                    Suggested: {knownPeople.get(verifications[selectedFace].clusterId)?.name || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Confidence: {(verifications[selectedFace].confidence * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVerify(verifications[selectedFace].clusterId, true)}
                    className={`px-3 py-1 text-xs rounded ${
                      verifications[selectedFace].verified === true
                        ? 'bg-green-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    ✓ Correct
                  </button>
                  <button
                    onClick={() => handleVerify(verifications[selectedFace].clusterId, false)}
                    className={`px-3 py-1 text-xs rounded ${
                      verifications[selectedFace].verified === false
                        ? 'bg-red-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    ✗ Wrong
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">No match found</p>
            </div>
          )}

          {/* Add new person */}
          {!showNewPersonForm ? (
            <button
              onClick={() => setShowNewPersonForm(true)}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              + Tag as new person
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateNew()}
                placeholder="Enter person's name"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <button
                onClick={handleCreateNew}
                className="px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowNewPersonForm(false)
                  setNewPersonName('')
                }}
                className="px-3 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
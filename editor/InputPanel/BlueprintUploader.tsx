import { useState } from 'react';
import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';
import { BlueprintTracer } from './BlueprintTracer';
import { DEFAULT_BUILDING_SPEC } from '@/lib/editor/types/buildingSpec';

export function BlueprintUploader() {
  const { addBuilding } = useBuildings();
  const [blueprintImage, setBlueprintImage] = useState<string | null>(null);
  const [tracedBuildingsCount, setTracedBuildingsCount] = useState(0);

  const handleBlueprintUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setBlueprintImage(dataUrl);
        setTracedBuildingsCount(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFootprintComplete = (footprint: Array<[number, number]>) => {
    // Create a new building with the traced footprint
    // Position it at the center of the traced shape
    const centerX = footprint.reduce((sum, p) => sum + p[0], 0) / footprint.length;
    const centerZ = footprint.reduce((sum, p) => sum + p[1], 0) / footprint.length;

    // Offset footprint to be relative to building position (centered at origin)
    const relativeFootprint: Array<[number, number]> = footprint.map(p => [
      p[0] - centerX,
      p[1] - centerZ
    ]);

    // Create building with footprint at the calculated position
    addBuilding({ x: centerX, y: 0, z: centerZ }, {
      footprint: relativeFootprint,
      blueprintImage: blueprintImage || undefined,
    });

    setTracedBuildingsCount(prev => prev + 1);
  };

  const clearBlueprint = () => {
    setBlueprintImage(null);
    setTracedBuildingsCount(0);
  };

  return (
    <div className="space-y-5">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Blueprint Tracer</h3>

      <div>
        <label className="block">
          <span className="text-sm font-semibold text-gray-700 mb-3 block">
            Upload Floor Plan
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleBlueprintUpload}
            className="block w-full text-sm text-gray-600
              file:mr-4 file:py-2.5 file:px-5
              file:rounded-full file:border-2
              file:text-sm file:font-medium
              file:bg-gray-100 file:border-emerald-400/60 file:text-emerald-700
              hover:file:bg-emerald-500 hover:file:border-emerald-400 hover:file:text-white
              file:cursor-pointer file:transition-all file:duration-200
              file:shadow-md hover:file:shadow-[0_8px_25px_-5px_rgba(16,185,129,0.35)] hover:file:-translate-y-0.5"
          />
        </label>
      </div>

      {blueprintImage && (
        <div className="space-y-4">
          <BlueprintTracer
            blueprintImage={blueprintImage}
            onFootprintComplete={handleFootprintComplete}
          />

          {tracedBuildingsCount > 0 && (
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 shadow-sm">
              <p className="text-sm font-semibold text-green-800">
                ✓ {tracedBuildingsCount} building{tracedBuildingsCount > 1 ? 's' : ''} traced
              </p>
            </div>
          )}

          <button
            onClick={clearBlueprint}
            className="w-full px-5 py-2.5 rounded-full font-medium text-sm border-2 bg-gray-100 border-red-400/60 text-red-700 hover:bg-red-500 hover:border-red-400 hover:text-white hover:shadow-[0_8px_25px_-5px_rgba(239,68,68,0.35)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ease-out"
          >
            Clear Blueprint
          </button>
        </div>
      )}
    </div>
  );
}

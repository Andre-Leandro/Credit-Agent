import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, DoorOpen, ExternalLink, Home, MapPin, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { useToast } from './Toast';
import { useAuth } from '../contexts/AuthContext';

interface MeliSearchResult {
  titulo?: string;
  precio?: string;
  ubicacion?: string;
  ambientes?: number | string;
  imagen?: string;
  imagenes?: string[];
  link?: string;
}

interface PropertySearchFormProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

const tryParseJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const normalizeLambdaPayload = (rawData: unknown): Record<string, unknown> => {
  const level1 = tryParseJson(rawData);
  if (!level1 || typeof level1 !== 'object') return {};

  const obj1 = level1 as Record<string, unknown>;
  const body1 = tryParseJson(obj1.body);

  if (body1 && typeof body1 === 'object') {
    const obj2 = body1 as Record<string, unknown>;
    const nestedBody = tryParseJson(obj2.body);
    if (nestedBody && typeof nestedBody === 'object') {
      return nestedBody as Record<string, unknown>;
    }
    return obj2;
  }

  return obj1;
};

const parseLambdaResponse = async (response: Response): Promise<Record<string, unknown>> => {
  const rawText = await response.text();
  const parsedTop = tryParseJson(rawText);
  return normalizeLambdaPayload(parsedTop);
};

const extractSearchResults = (payload: Record<string, unknown>): MeliSearchResult[] => {
  const status = typeof payload.status === 'string' ? payload.status.toLowerCase() : '';
  const parsedResults: MeliSearchResult[] = Array.isArray(payload.results)
    ? (payload.results as MeliSearchResult[])
    : [];

  const isSuccessful = status === 'success' || parsedResults.length > 0;
  if (!isSuccessful) {
    throw new Error('La lambda respondio sin estado success');
  }

  return parsedResults;
};

export const PropertySearchForm: React.FC<PropertySearchFormProps> = ({ 
  onSendMessage, 
  isLoading = false 
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'meli'>('chat');
  const [address, setAddress] = useState('');
  const [propertyType, setPropertyType] = useState('Departamento');
  const [environments, setEnvironments] = useState('1');
  const [meliQuery, setMeliQuery] = useState('');
  const [results, setResults] = useState<MeliSearchResult[]>([]);
  const [imageIndexes, setImageIndexes] = useState<Record<string, number>>({});
  const [isSearching, setIsSearching] = useState(false);
  const { addToast } = useToast();
  const { user } = useAuth();

  const propertyTypes = [
    'Departamento',
    'Casa',
    'PH',
    'Duplex',
    'Loft',
    'Terreno',
  ];

  const runSearchRequest = async (lambdaUrl: string, finalQuery: string, dni: string) => {
    const payload = {
      action: 'search_meli',
      q: finalQuery,
      dni,
    };

    const response = await fetch(lambdaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('🔎 search_meli response status:', response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const parsedBody = await parseLambdaResponse(response);
    console.log('📦 search_meli parsed payload:', parsedBody);

    const parsedResults = extractSearchResults(parsedBody);
    const debug = parsedBody.debug as Record<string, unknown> | undefined;
    const itemsCount = typeof debug?.items_count === 'number' ? debug.items_count : undefined;

    return {
      results: parsedResults,
      itemsCount,
    };
  };

  const validateManualFields = () => {
    const cleanAddress = address.trim();
    const parsedEnvironments = Number(environments);

    if (!cleanAddress) {
      addToast('Completa la direccion o zona', 'error');
      return false;
    }

    if (!propertyType.trim()) {
      addToast('Selecciona un tipo de propiedad', 'error');
      return false;
    }

    if (!Number.isFinite(parsedEnvironments) || parsedEnvironments <= 0) {
      addToast('Ingresa una cantidad valida de ambientes', 'error');
      return false;
    }

    return true;
  };

  const handleSendManualToChat = () => {
    if (!validateManualFields()) {
      return;
    }

    const message = `Los datos de la propiedad elegida son:

- Direccion: ${address.trim()}
- Tipo de Propiedad: ${propertyType}
- Ambientes: ${environments}`;

    onSendMessage(message);
    addToast('Criterios de busqueda enviados al chat', 'success');
  };

  const handleSearch = async () => {
    console.log('🟢 Click en Buscar Propiedad');

    const cleanQuery = meliQuery.trim();
    const fallbackAddress = address.trim();
    const fallbackEnvironments = Number(environments);
    const canBuildFallback =
      !!fallbackAddress &&
      !!propertyType.trim() &&
      Number.isFinite(fallbackEnvironments) &&
      fallbackEnvironments > 0;

    const finalQuery = cleanQuery || (canBuildFallback
      ? `${propertyType} ${fallbackAddress} ${fallbackEnvironments} ambientes`
      : '');

    console.log('🧠 search_meli finalQuery:', finalQuery);

    if (!finalQuery) {
      addToast('Escribe una busqueda o completa Direccion, Tipo y Ambientes', 'error');
      return;
    }

    if (!user?.dni) {
      addToast('No encontramos el DNI del usuario logueado', 'error');
      return;
    }

    const lambdaUrl = import.meta.env.VITE_LAMBDA_URL;
    if (!lambdaUrl) {
      addToast('VITE_LAMBDA_URL no esta configurada', 'error');
      return;
    }

    console.log('🌐 search_meli URL:', lambdaUrl);
    setIsSearching(true);

    try {
      const queryCandidates = Array.from(new Set([
        finalQuery,
        `inmuebles ${finalQuery}`,
        `${finalQuery} argentina`,
      ]));

      let parsedResults: MeliSearchResult[] = [];
      let lastItemsCount: number | undefined;

      for (const candidate of queryCandidates) {
        console.log('🔁 Probando query search_meli:', candidate);

        const attempt = await runSearchRequest(lambdaUrl, candidate, user.dni);
        parsedResults = attempt.results;
        lastItemsCount = attempt.itemsCount;

        if (parsedResults.length > 0) {
          break;
        }
      }

      if (parsedResults.length === 0) {
        const extra = typeof lastItemsCount === 'number' ? ` (items_count=${lastItemsCount})` : '';
        throw new Error(`La busqueda no devolvio propiedades${extra}. Proba una consulta mas especifica.`);
      }

      setResults(parsedResults);

      addToast(`Se encontraron ${parsedResults.length} propiedades`, 'success');
    } catch (error) {
      console.error('Error buscando propiedades:', error);
      const message = error instanceof Error ? error.message : 'No se pudo completar la busqueda de propiedades';
      addToast(message, 'error');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseResultInChat = (result: MeliSearchResult) => {
    const message = `Me interesa esta propiedad:

- Titulo: ${result.titulo || 'N/A'}
- Precio: ${result.precio || 'N/A'}
- Ubicacion: ${result.ubicacion || 'N/A'}
- Ambientes: ${result.ambientes ?? 'N/A'}
- Link: ${result.link || 'N/A'}`;

    onSendMessage(message);
    addToast('Propiedad enviada al chat', 'success');
  };

  const getResultKey = (result: MeliSearchResult, index: number) =>
    `${result.link || result.titulo || 'item'}-${index}`;

  const getImageList = (result: MeliSearchResult): string[] => {
    const images = Array.isArray(result.imagenes)
      ? result.imagenes.filter((img): img is string => typeof img === 'string' && img.trim().length > 0)
      : [];

    if (images.length > 0) {
      return images;
    }

    if (result.imagen && result.imagen.trim().length > 0) {
      return [result.imagen];
    }

    return [];
  };

  const goToPrevImage = (cardKey: string, totalImages: number) => {
    if (totalImages <= 1) return;

    setImageIndexes((prev) => {
      const current = prev[cardKey] ?? 0;
      return {
        ...prev,
        [cardKey]: (current - 1 + totalImages) % totalImages,
      };
    });
  };

  const goToNextImage = (cardKey: string, totalImages: number) => {
    if (totalImages <= 1) return;

    setImageIndexes((prev) => {
      const current = prev[cardKey] ?? 0;
      return {
        ...prev,
        [cardKey]: (current + 1) % totalImages,
      };
    });
  };

  const handleReset = () => {
    setAddress('');
    setPropertyType('Departamento');
    setEnvironments('1');
    setMeliQuery('');
    setResults([]);
    setImageIndexes({});
  };

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="flex-1 overflow-y-auto p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 mt-6">Búsqueda de Propiedad</h2>

        <div className="mb-5">
          <div className="grid grid-cols-2 rounded-lg border border-gray-200 p-1 bg-gray-50">
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`h-9 rounded-md text-sm font-semibold transition-colors ${
                activeTab === 'chat' ? 'bg-white text-[#10069f] shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Enviar al chat
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('meli')}
              className={`h-9 rounded-md text-sm font-semibold transition-colors ${
                activeTab === 'meli' ? 'bg-white text-[#10069f] shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Buscador 
            </button>
          </div>
        </div>

        {activeTab === 'chat' ? (
          <div className="space-y-5 pb-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#10069f]" />
                Direccion o zona
              </Label>
              <Input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="text-sm h-10"
                placeholder="Ej: Palermo Soho"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Home className="w-4 h-4 text-[#10069f]" />
                Tipo de propiedad
              </Label>
              <Select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full h-10 text-sm"
                disabled={isLoading}
              >
                {propertyTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <DoorOpen className="w-4 h-4 text-[#10069f]" />
                Ambientes
              </Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={environments}
                onChange={(e) => setEnvironments(e.target.value)}
                className="text-sm h-10"
                placeholder="3"
                disabled={isLoading}
              />
            </div>

            <Button
              onClick={handleSendManualToChat}
              disabled={isLoading}
              className="w-full h-10 text-sm font-semibold bg-[#10069f] hover:bg-[#0a0470] disabled:opacity-50"
              variant="default"
            >
              Enviar al chat
            </Button>
          </div>
        ) : (
          <div className="space-y-5 pb-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-[#10069f]" />
                Buscador de Argenprop
              </Label>
              <Input
                type="text"
                value={meliQuery}
                onChange={(e) => setMeliQuery(e.target.value)}
                className="text-sm h-10"
                placeholder="Ej: departamento palermo 3 ambientes (opcional si ya completaste la otra pestaña)"
                disabled={isLoading || isSearching}
              />
            </div>

            <Button
              onClick={handleSearch}
              disabled={isLoading || isSearching}
              className="w-full h-10 text-sm font-semibold bg-[#10069f] hover:bg-[#0a0470] disabled:opacity-50"
              variant="default"
            >
              <Search className="w-4 h-4 mr-2" />
              Buscar Propiedad
            </Button>

            {results.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-900">Resultados</p>
                {results.map((result, index) => (
                  <div key={getResultKey(result, index)} className="rounded-lg border border-gray-200 bg-white p-3">
                    {(() => {
                      const images = getImageList(result);
                      if (images.length === 0) return null;

                      const cardKey = getResultKey(result, index);
                      const currentIndex = imageIndexes[cardKey] ?? 0;
                      const safeIndex = currentIndex % images.length;
                      const currentImage = images[safeIndex];

                      return (
                        <div className="relative mb-3">
                          <img
                            src={currentImage}
                            alt={result.titulo || `Resultado ${index + 1}`}
                            className="w-full h-36 object-cover rounded-md"
                          />

                          {images.length > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={() => goToPrevImage(cardKey, images.length)}
                                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-1.5 text-white hover:bg-black/70"
                                aria-label="Imagen anterior"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => goToNextImage(cardKey, images.length)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-1.5 text-white hover:bg-black/70"
                                aria-label="Imagen siguiente"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>

                              <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-white">
                                {safeIndex + 1}/{images.length}
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })()}
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2">{result.titulo || 'Sin titulo'}</p>
                    <p className="text-sm text-[#10069f] font-bold mt-1">$ {result.precio || 'N/A'}</p>
                    <p className="text-xs text-gray-600 mt-1">{result.ubicacion || 'Ubicacion no disponible'}</p>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {result.link && (
                        <a
                          href={result.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full"
                        >
                          <Button type="button" variant="outline" className="w-full h-9 text-xs font-semibold">
                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                            Ver
                          </Button>
                        </a>
                      )}
                      <Button
                        type="button"
                        onClick={() => handleUseResultInChat(result)}
                        className="w-full h-9 text-xs font-semibold bg-[#10069f] hover:bg-[#0a0470]"
                      >
                        Enviar al chat
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botones */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <Button
          onClick={handleReset}
          disabled={isLoading || isSearching}
          className="w-full h-10 text-sm font-semibold"
          variant="outline"
        >
          Limpiar
        </Button>
      </div>
    </div>
  );
};

export function encodeLoadout(loadoutState) {
  // We explicitly map the structure to drop unnecessary fields
  // Filter out any 0s or empty arrays
  const cleanSpecials = {};
  for (const [k, v] of Object.entries(loadoutState.specials)) {
    if (v > 0) cleanSpecials[k] = v;
  }
  
  const cleanStackables = {};
  for (const [k, v] of Object.entries(loadoutState.stackables)) {
    if (v > 0) cleanStackables[k] = v;
  }

  const payload = {
    v: 1,
    specials: cleanSpecials,
    uniques: loadoutState.uniques,
    stackables: cleanStackables
  };

  const jsonStr = JSON.stringify(payload);
  
  // Base64 encode for URL safety
  // In the browser, btoa is available
  try {
    return btoa(jsonStr);
  } catch (e) {
    console.error("Failed to encode loadout", e);
    return null;
  }
}

export function decodeLoadout(base64Str) {
  try {
    const jsonStr = atob(base64Str);
    const parsed = JSON.parse(jsonStr);
    
    // Ensure the structure is valid
    if (parsed.v !== 1) {
      console.warn("Unsupported build version:", parsed.v);
      return null;
    }

    return {
      specials: parsed.specials || {},
      uniques: parsed.uniques || [],
      stackables: parsed.stackables || {}
    };
  } catch (e) {
    console.error("Failed to decode loadout", e);
    return null;
  }
}

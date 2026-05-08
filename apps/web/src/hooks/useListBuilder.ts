import { useCallback, useMemo, useReducer } from 'react';
import {
  ListValidator,
  type ListValidationResult,
  type PokemonSnapshot,
} from '@pokemon/shared';
import type { CatalogItem } from '../api/types';

interface State {
  name: string;
  items: PokemonSnapshot[];
}

type Action =
  | { type: 'toggle'; pokemon: CatalogItem }
  | { type: 'remove'; pokemonId: number }
  | { type: 'setName'; name: string }
  | {
      type: 'setFromFile';
      payload: { name: string; items: { pokemonId: number; name: string; weight: number }[] };
    }
  | { type: 'clear' };

const initialState: State = { name: '', items: [] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'toggle': {
      const exists = state.items.some(
        (i) => i.pokemonId === action.pokemon.id,
      );
      if (exists) {
        return {
          ...state,
          items: state.items.filter((i) => i.pokemonId !== action.pokemon.id),
        };
      }
      return {
        ...state,
        items: [
          ...state.items,
          {
            pokemonId: action.pokemon.id,
            name: action.pokemon.name,
            weight: action.pokemon.weight,
            sprite: action.pokemon.sprite,
          },
        ],
      };
    }
    case 'remove':
      return {
        ...state,
        items: state.items.filter((i) => i.pokemonId !== action.pokemonId),
      };
    case 'setName':
      return { ...state, name: action.name };
    case 'setFromFile':
      return {
        name: action.payload.name,
        items: action.payload.items.map((i) => ({
          pokemonId: i.pokemonId,
          name: i.name,
          weight: i.weight,
          sprite: '',
        })),
      };
    case 'clear':
      return initialState;
  }
}

export interface UseListBuilder {
  name: string;
  items: PokemonSnapshot[];
  totalWeight: number;
  uniqueSpecies: number;
  validation: ListValidationResult;
  isSelected: (pokemonId: number) => boolean;
  toggle: (pokemon: CatalogItem) => void;
  remove: (pokemonId: number) => void;
  setName: (name: string) => void;
  setFromFile: (payload: {
    name: string;
    items: { pokemonId: number; name: string; weight: number }[];
  }) => void;
  clear: () => void;
}

export function useListBuilder(): UseListBuilder {
  const [state, dispatch] = useReducer(reducer, initialState);

  const totalWeight = useMemo(
    () => state.items.reduce((sum, i) => sum + i.weight, 0),
    [state.items],
  );
  const uniqueSpecies = useMemo(
    () => new Set(state.items.map((i) => i.pokemonId)).size,
    [state.items],
  );
  const validation = useMemo(
    () => ListValidator.validate(state.items),
    [state.items],
  );

  const toggle = useCallback(
    (pokemon: CatalogItem) => dispatch({ type: 'toggle', pokemon }),
    [],
  );
  const remove = useCallback(
    (pokemonId: number) => dispatch({ type: 'remove', pokemonId }),
    [],
  );
  const setName = useCallback(
    (name: string) => dispatch({ type: 'setName', name }),
    [],
  );
  const setFromFile = useCallback<UseListBuilder['setFromFile']>(
    (payload) => dispatch({ type: 'setFromFile', payload }),
    [],
  );
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);
  const isSelected = useCallback(
    (pokemonId: number) => state.items.some((i) => i.pokemonId === pokemonId),
    [state.items],
  );

  return {
    name: state.name,
    items: state.items,
    totalWeight,
    uniqueSpecies,
    validation,
    isSelected,
    toggle,
    remove,
    setName,
    setFromFile,
    clear,
  };
}

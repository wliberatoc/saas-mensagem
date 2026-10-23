import { createContext } from 'react';

import type { AsyncState } from '../hooks/useObservableState';
import type { Connection } from '../types/connection';

export const ConnectionsContext = createContext<AsyncState<Connection[]> | undefined>(undefined);

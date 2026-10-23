import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Observable, of } from 'rxjs';

import type { Connection } from '../../types/connection';

const pageMocks = vi.hoisted(() => ({
    observeConnection: vi.fn(),
    observeContacts: vi.fn(),
    useAuth: vi.fn(),
    useConnections: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: pageMocks.useAuth }));
vi.mock('../../hooks/useConnections', () => ({ useConnections: pageMocks.useConnections }));
vi.mock('../../services/connections', () => ({
    observeConnection: pageMocks.observeConnection,
}));
vi.mock('../../services/contacts', () => ({ observeContacts: pageMocks.observeContacts }));
vi.mock('../../components/AppHeader', () => ({
    AppHeader: () => <header>Connection header</header>,
}));
vi.mock('../../components/ContactsSection', () => ({
    ContactsSection: () => <div>Contacts content</div>,
}));
vi.mock('../../components/MessagesSection', () => ({
    MessagesSection: () => <div>Messages content</div>,
}));

import { ConnectionDetailsPage } from './index';

const connection: Connection = {
    id: 'connection-1',
    clientId: 'client-1',
    name: 'Connection 1',
    createdAt: null,
    updatedAt: null,
};

function renderDetails() {
    return render(
        <MemoryRouter initialEntries={['/conexoes/connection-1']}>
            <Routes>
                <Route path="/conexoes/:connectionId" element={<ConnectionDetailsPage />} />
                <Route path="/dashboard" element={<div>Dashboard</div>} />
            </Routes>
        </MemoryRouter>,
    );
}

beforeEach(() => {
    pageMocks.useAuth.mockReturnValue({ user: { uid: 'client-1' }, loading: false });
    pageMocks.useConnections.mockReturnValue({
        status: 'ready',
        data: [connection],
        error: null,
    });
    pageMocks.observeConnection.mockReturnValue(of(connection));
});

afterEach(cleanup);

describe('ConnectionDetailsPage', () => {
    it('keeps one contacts subscription while switching tabs and closes it on unmount', () => {
        let subscriptions = 0;
        const teardown = vi.fn();
        pageMocks.observeContacts.mockReturnValue(new Observable((subscriber) => {
            subscriptions += 1;
            subscriber.next([]);
            return teardown;
        }));
        const { unmount } = renderDetails();

        expect(screen.getByText('Contacts content')).toBeTruthy();
        expect(subscriptions).toBe(1);

        act(() => {
            fireEvent.click(screen.getByRole('tab', { name: 'Mensagens' }));
        });

        expect(screen.getByText('Messages content')).toBeTruthy();
        expect(subscriptions).toBe(1);
        expect(teardown).not.toHaveBeenCalled();

        unmount();
        expect(teardown).toHaveBeenCalledTimes(1);
    });

    it('preserves the missing connection error state', () => {
        pageMocks.observeConnection.mockReturnValue(of(null));
        pageMocks.observeContacts.mockReturnValue(of([]));

        renderDetails();

        expect(screen.getByText(/A conexão não existe/)).toBeTruthy();
    });
});

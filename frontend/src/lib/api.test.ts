/**
 * API client tests.
 *
 * Tests the API functions with mocked fetch.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ApiError,
  listProjects,
  createProject,
  listModels,
  loadGraph,
  saveGraph,
} from './api'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('API client', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('listProjects', () => {
    it('returns list of projects', async () => {
      const mockProjects = [
        { id: '1', name: 'Project 1', description: null },
        { id: '2', name: 'Project 2', description: 'Test project' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockProjects),
      })

      const result = await listProjects()

      expect(result).toEqual(mockProjects)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/projects'),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ detail: 'Database error' }),
      })

      await expect(listProjects()).rejects.toThrow(ApiError)
    })
  })

  describe('createProject', () => {
    it('creates a new project', async () => {
      const newProject = { id: '3', name: 'New Project', description: null }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(newProject),
      })

      const result = await createProject({ name: 'New Project' })

      expect(result).toEqual(newProject)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/projects'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'New Project' }),
        })
      )
    })
  })

  describe('listModels', () => {
    it('returns models for a project', async () => {
      const mockModels = [
        { id: 'm1', project_id: 'p1', name: 'Model 1', status: 'active' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockModels),
      })

      const result = await listModels('p1')

      expect(result).toEqual(mockModels)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/models?project_id=p1'),
        expect.any(Object)
      )
    })

    it('returns all models when no projectId', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      })

      await listModels()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/models'),
        expect.any(Object)
      )
      // Should not have query params
      expect(mockFetch.mock.calls[0][0]).not.toContain('?')
    })
  })

  describe('loadGraph', () => {
    it('loads graph for a model', async () => {
      const mockGraph = {
        nodes: [{ id: 'n1', type: 'service', name: 'API', position: { x: 0, y: 0 } }],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockGraph),
      })

      const result = await loadGraph('model-123')

      expect(result).toEqual(mockGraph)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/models/model-123/graph'),
        expect.any(Object)
      )
    })

    it('loads graph with level filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ nodes: [], edges: [] }),
      })

      await loadGraph('model-123', { level: 'L1' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/models/model-123/graph?level=L1'),
        expect.any(Object)
      )
    })
  })

  describe('saveGraph', () => {
    it('saves graph data', async () => {
      const graphData = {
        nodes: [{ id: 'n1', type: 'service', name: 'API', position: { x: 100, y: 200 } }],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(graphData),
      })

      const result = await saveGraph('model-123', graphData)

      expect(result).toEqual(graphData)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/models/model-123/graph'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(graphData),
        })
      )
    })
  })

  describe('ApiError', () => {
    it('includes status and detail', () => {
      const error = new ApiError('Request failed', 404, { detail: 'Not found' })

      expect(error.message).toBe('Request failed')
      expect(error.status).toBe(404)
      expect(error.detail).toEqual({ detail: 'Not found' })
      expect(error.name).toBe('ApiError')
    })
  })
})

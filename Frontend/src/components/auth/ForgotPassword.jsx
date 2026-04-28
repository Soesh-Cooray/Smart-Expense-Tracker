type="password"
                      name="confirmPassword"
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <button type="submit" className="auth-submit" disabled={submitting || !isPasswordStrong}>
                  {submitting ? 'Resetting…' : 'Reset Password'}
                </button>
              </form>
            )}
          </div>

          <p className="auth-switch">
            Remembered your password?{' '}
            <button type="button" onClick={() => navigate('/login')}>
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
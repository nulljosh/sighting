import Foundation
import Supabase

// ponytail: anon key is public by design (RLS-guarded, already shipped in the web bundle),
// so it's baked in — env vars only exist when launched from Xcode, not for installed apps.
private let defaultURL = "https://tjsxsqlxjmanwvmywwvw.supabase.co"
private let defaultKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqc3hzcWx4am1hbnd2bXl3d3Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0OTc0MDEsImV4cCI6MjA4NjA3MzQwMX0.LphLfho3wdQC20MhtcnBpzQUNuBoTOobrugQbNGxc68"

private let env = ProcessInfo.processInfo.environment

let supabase = SupabaseClient(
    supabaseURL: URL(string: env["SUPABASE_URL"] ?? defaultURL)!,
    supabaseKey: env["SUPABASE_ANON_KEY"] ?? defaultKey
)

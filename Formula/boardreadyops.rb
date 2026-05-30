class Boardreadyops < Formula
  desc "CI preflight for production-ready PCBs"
  homepage "https://github.com/oaslananka/boardreadyops"
  version "1.1.0"
  license "MIT"

  # Release v1.1.0 checksums from SHA256SUMS.
  # Regenerate with: gh release download v#{version} && sha256sum boardreadyops-* > SHA256SUMS
  on_macos do
    on_arm do
      url "https://github.com/oaslananka/boardreadyops/releases/download/v#{version}/boardreadyops-macos-arm64"
      sha256 "8b28c9d68d02390b8873b788efd0d94cd06c92a9dc956cff596de6b2fdc7ae85"
    end

    on_intel do
      url "https://github.com/oaslananka/boardreadyops/releases/download/v#{version}/boardreadyops-macos-x64"
      sha256 "1bd9e914f848ee0086c5cd3e2823117e28f5b3409a766ed0c6cfa7a736ffb2f0"
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/oaslananka/boardreadyops/releases/download/v#{version}/boardreadyops-linux-arm64"
      sha256 "664c52b4ab8a31e34a21b9e0fb5c5968a5ab0915826ee949286f462d281a09c1"
    end

    on_intel do
      url "https://github.com/oaslananka/boardreadyops/releases/download/v#{version}/boardreadyops-linux-x64"
      sha256 "d0d07dd0d34e1bf2f748449d7603345b9533068cb6730bf5a52cd432f1805e65"
    end
  end

  def install
    bin.install Dir["boardreadyops-*"].first => "boardreadyops"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/boardreadyops --version")
  end
end
